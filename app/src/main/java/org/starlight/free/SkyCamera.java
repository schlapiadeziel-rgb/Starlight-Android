package org.starlight.free;

import android.app.Activity;
import android.graphics.SurfaceTexture;
import android.hardware.Camera;
import android.view.*;
import android.widget.FrameLayout;
import java.util.List;

/** Rear-camera preview only: no image capture, recording, upload, or microphone. */
@SuppressWarnings("deprecation")
final class SkyCamera implements TextureView.SurfaceTextureListener {
    interface Listener { void ready(double horizontalFov); void failed(); }
    private final Activity activity;
    private final FrameLayout host;
    private final Listener listener;
    private TextureView texture;
    private Camera camera;
    private boolean wanted;
    private double angle;
    private int previewWidth,previewHeight;
    SkyCamera(Activity activity,FrameLayout host,Listener listener){this.activity=activity;this.host=host;this.listener=listener;}
    void start(){
        wanted=true;
        if(texture!=null)return;
        texture=new TextureView(activity);
        texture.setSurfaceTextureListener(this);
        host.addView(texture,new FrameLayout.LayoutParams(-1,-1));
        if(texture.isAvailable())open(texture.getSurfaceTexture());
    }
    void stop(){wanted=false;release();if(texture!=null){texture.setSurfaceTextureListener(null);host.removeView(texture);texture=null;}}
    private void release(){if(camera!=null){try{camera.stopPreview();}catch(Exception ignored){}camera.release();camera=null;}}
    private void open(SurfaceTexture surface){
        if(!wanted||camera!=null)return;
        try{
            int id=-1;Camera.CameraInfo info=new Camera.CameraInfo();
            for(int i=0;i<Camera.getNumberOfCameras();i++){Camera.getCameraInfo(i,info);if(info.facing==Camera.CameraInfo.CAMERA_FACING_BACK){id=i;break;}}
            if(id<0)throw new IllegalStateException("No rear camera");
            camera=Camera.open(id);
            Camera.Parameters params=camera.getParameters();
            Camera.Size chosen=null;
            for(Camera.Size s:params.getSupportedPreviewSizes()){
                if(s.width<=1920&&s.height<=1080&&(chosen==null||Math.abs((double)s.width/s.height-4.0/3)<Math.abs((double)chosen.width/chosen.height-4.0/3)||Math.abs((double)s.width/s.height-(double)chosen.width/chosen.height)<.01&&s.width>chosen.width))chosen=s;
            }
            if(chosen==null)chosen=params.getSupportedPreviewSizes().get(0);
            params.setPreviewSize(chosen.width,chosen.height);
            List<String> focus=params.getSupportedFocusModes();
            if(focus!=null&&focus.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_VIDEO))params.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_VIDEO);
            camera.setParameters(params);
            int rotation=activity.getWindowManager().getDefaultDisplay().getRotation();
            int degrees=rotation==Surface.ROTATION_90?90:rotation==Surface.ROTATION_180?180:rotation==Surface.ROTATION_270?270:0;
            int orientation=(info.orientation-degrees+360)%360;
            camera.setDisplayOrientation(orientation);
            boolean swap=orientation%180!=0;
            previewWidth=swap?chosen.height:chosen.width;previewHeight=swap?chosen.width:chosen.height;
            params=camera.getParameters();angle=swap?params.getVerticalViewAngle():params.getHorizontalViewAngle();
            if(!Double.isFinite(angle)||angle<10||angle>150)angle=45;
            camera.setErrorCallback((error,cam)->{stop();listener.failed();});
            camera.setPreviewTexture(surface);camera.startPreview();layout();
        }catch(Exception e){stop();listener.failed();}
    }
    private void layout(){
        if(camera==null||texture==null||host.getWidth()==0||host.getHeight()==0)return;
        double scale=Math.max((double)host.getWidth()/previewWidth,(double)host.getHeight()/previewHeight);
        int w=(int)Math.ceil(previewWidth*scale),h=(int)Math.ceil(previewHeight*scale);
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(w,h,Gravity.CENTER);texture.setLayoutParams(lp);
        double visibleAngle=Math.toDegrees(2*Math.atan(Math.tan(Math.toRadians(angle/2))*host.getWidth()/w));
        listener.ready(visibleAngle);
    }
    public void onSurfaceTextureAvailable(SurfaceTexture s,int w,int h){open(s);}
    public void onSurfaceTextureSizeChanged(SurfaceTexture s,int w,int h){if(camera!=null)layout();}
    public boolean onSurfaceTextureDestroyed(SurfaceTexture s){release();return true;}
    public void onSurfaceTextureUpdated(SurfaceTexture s){}
}
