package org.starlight.free;

import android.app.Activity;
import android.Manifest;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.hardware.*;
import android.location.*;
import android.webkit.*;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.content.Intent;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends Activity implements SensorEventListener, LocationListener {
    private WebView web;
    private SkyCamera skyCamera;
    private boolean cameraWanted=false, resumed=false;
    private String pendingExport;
    private final float[] screenMatrix=new float[9];
    private SensorManager sensors;
    private LocationManager locations;
    private boolean tracking=false, ready=false;
    private long lastFrame=0;
    private float declination=0;
    private final float[] matrix=new float[9];

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().setStatusBarColor(0xff070d19);
        getWindow().setNavigationBarColor(0xff070d19);
        sensors=(SensorManager)getSystemService(SENSOR_SERVICE);
        locations=(LocationManager)getSystemService(LOCATION_SERVICE);
        web=new WebView(this);
        web.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.addJavascriptInterface(new Bridge(),"NativeSky");
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                if("https".equals(r.getUrl().getScheme()) && "app.starlight.local".equals(r.getUrl().getHost())) {
                    String path=r.getUrl().getPath();
                    if(path==null || path.contains("..")) return new WebResourceResponse("text/plain","UTF-8",null);
                    if(path.equals("/")) path="/index.html";
                    String mime=path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":"text/html";
                    try {return new WebResourceResponse(mime,"UTF-8",getAssets().open(path.substring(1)));}catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",null);}
                }
                return new WebResourceResponse("text/plain","UTF-8",null);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {return true;}
            @Override public void onPageFinished(WebView v,String url){ready=true;}
        });
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(0xff070d19);
        FrameLayout content=new FrameLayout(this);
        FrameLayout preview=new FrameLayout(this);
        root.addView(content,new FrameLayout.LayoutParams(-1,-1));
        content.addView(preview,new FrameLayout.LayoutParams(-1,-1));
        content.addView(web,new FrameLayout.LayoutParams(-1,-1));
        skyCamera=new SkyCamera(this,preview,new SkyCamera.Listener(){
            public void ready(double fov){js(String.format(Locale.US,"nativeCameraReady(%.5f)",fov));}
            public void failed(){cameraWanted=false;js("nativeCameraStopped(\"摄像头不可用或被占用，请关闭其他相机应用后重试\")");}
        });
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets.consumeSystemWindowInsets();});
        web.loadUrl("https://app.starlight.local/");
    }
    private void js(String code){runOnUiThread(()->{if(ready) web.evaluateJavascript(code,null);});}
    public class Bridge {
        @JavascriptInterface public void track(boolean enabled){runOnUiThread(()->{
            tracking=enabled; sensors.unregisterListener(MainActivity.this);
            if(enabled){
                Sensor s=sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
                if(s==null){tracking=false;js("nativeUnavailable()");return;}
                sensors.registerListener(MainActivity.this,s,SensorManager.SENSOR_DELAY_GAME);
                getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });}
        @JavascriptInterface public void camera(boolean enabled){runOnUiThread(()->{
            cameraWanted=enabled;
            if(!enabled){skyCamera.stop();return;}
            if(sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)==null){cameraWanted=false;js("nativeCameraStopped(\"此设备缺少方向传感器，仍可使用离线星图\")");return;}
            if(checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED)
                requestPermissions(new String[]{Manifest.permission.CAMERA},6);
            else if(resumed)skyCamera.start();
        });}
        @JavascriptInterface public void exportNotes(String data){runOnUiThread(()->{
            if(data==null||data.getBytes(StandardCharsets.UTF_8).length>2000000){js("toast('备份过大，无法导出')");return;}
            pendingExport=data;
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"Starlight-observations.json");
            try{startActivityForResult(intent,7);}catch(Exception e){pendingExport=null;js("toast('系统文件选择器不可用')");}
        });}
        @JavascriptInterface public void importNotes(){runOnUiThread(()->{
            Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
            try{startActivityForResult(intent,8);}catch(Exception e){js("toast('系统文件选择器不可用')");}
        });}
        @JavascriptInterface public void locate(){runOnUiThread(()->{
            if(checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED)
                requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,Manifest.permission.ACCESS_FINE_LOCATION},5);
            else startLocation();
        });}
        @JavascriptInterface public void setCoordinates(double lat,double lon){
            if(Double.isNaN(lat)||Double.isNaN(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
            declination=new GeomagneticField((float)lat,(float)lon,0,System.currentTimeMillis()).getDeclination();
        }
    }
    private void startLocation(){
        try{
            boolean any=false;
            for(String provider:locations.getProviders(true)){
                if(!provider.equals(LocationManager.GPS_PROVIDER)&&!provider.equals(LocationManager.NETWORK_PROVIDER))continue;
                Location last=locations.getLastKnownLocation(provider);
                if(last!=null && System.currentTimeMillis()-last.getTime()<3600000)onLocationChanged(last);
                locations.requestLocationUpdates(provider,10000,100,this);any=true;
            }
            if(!any)js("toast('请开启系统定位，或手动设置经纬度')");
        }catch(SecurityException e){js("toast('未获定位权限，请手动设置位置')");}
    }
    @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){
        super.onRequestPermissionsResult(r,p,g);
        if(r==6){
            if(g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED&&cameraWanted){if(resumed)skyCamera.start();}
            else{cameraWanted=false;js("nativeCameraStopped(\"未获得相机权限，可继续使用离线星图\")");}
        }else if(r==5){
            if(g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED)startLocation();
            else js("toast('可以使用手动位置，定位并非必需')");
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request!=7&&request!=8)return;
        if(result!=RESULT_OK||data==null||data.getData()==null){if(request==7)pendingExport=null;js("toast('已取消文件操作')");return;}
        if(request==7){
            if(pendingExport==null){js("toast('导出已中断，请重试')");return;}
            try(OutputStream out=getContentResolver().openOutputStream(data.getData(),"wt")){
                if(out==null)throw new IOException();out.write(pendingExport.getBytes(StandardCharsets.UTF_8));js("toast('观测备份已保存')");
            }catch(Exception e){js("toast('保存失败，请选择其他位置')");}finally{pendingExport=null;}
        }else{
            try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
                if(in==null)throw new IOException();byte[] buf=new byte[8192];int count;
                while((count=in.read(buf))!=-1){if(out.size()+count>2000000)throw new IOException();out.write(buf,0,count);}
                js("nativeImportNotes("+org.json.JSONObject.quote(new String(out.toByteArray(),StandardCharsets.UTF_8))+")");
            }catch(Exception e){js("toast('无法读取备份：文件应小于 2 MB')");}
        }
    }
    @Override public void onLocationChanged(Location l){
        declination=new GeomagneticField((float)l.getLatitude(),(float)l.getLongitude(),(float)l.getAltitude(),System.currentTimeMillis()).getDeclination();
        js(String.format(Locale.US,"nativeLocation(%.7f,%.7f)",l.getLatitude(),l.getLongitude()));
    }
    @Override public void onSensorChanged(SensorEvent e){
        if(!tracking || !ready || e.timestamp-lastFrame<33000000)return;
        lastFrame=e.timestamp;
        SensorManager.getRotationMatrixFromVector(matrix,e.values);
        // Rear camera direction is device -Z, expressed in East/North/Up.
        double east=-matrix[2],north=-matrix[5],up=-matrix[8];
        double az=(Math.toDegrees(Math.atan2(east,north))+declination+360)%360;
        double alt=Math.toDegrees(Math.asin(Math.max(-1,Math.min(1,up))));
        int rotation=getWindowManager().getDefaultDisplay().getRotation();
        int x=SensorManager.AXIS_X,y=SensorManager.AXIS_Y;
        if(rotation==android.view.Surface.ROTATION_90){x=SensorManager.AXIS_Y;y=SensorManager.AXIS_MINUS_X;}
        else if(rotation==android.view.Surface.ROTATION_180){x=SensorManager.AXIS_MINUS_X;y=SensorManager.AXIS_MINUS_Y;}
        else if(rotation==android.view.Surface.ROTATION_270){x=SensorManager.AXIS_MINUS_Y;y=SensorManager.AXIS_X;}
        SensorManager.remapCoordinateSystem(matrix,x,y,screenMatrix);
        // Device top edge projected onto sky tangent plane gives screen roll.
        double a=Math.atan2(east,north),h=Math.asin(Math.max(-1,Math.min(1,up)));
        double rx=Math.cos(a),ry=-Math.sin(a);
        double ux=-Math.sin(a)*Math.sin(h),uy=-Math.cos(a)*Math.sin(h),uz=Math.cos(h);
        double roll=Math.atan2(screenMatrix[1]*rx+screenMatrix[4]*ry,screenMatrix[1]*ux+screenMatrix[4]*uy+screenMatrix[7]*uz);
        js(String.format(Locale.US,"nativeOrientation(%.5f,%.5f,%.5f)",az,alt,roll));
    }
    @Override public void onAccuracyChanged(Sensor s,int accuracy){if(accuracy==SensorManager.SENSOR_STATUS_UNRELIABLE)js("toast('指南针需要校准：远离金属，转动手机画 8 字')");}
    @Override public void onProviderEnabled(String p){}
    @Override public void onProviderDisabled(String p){}
    @Override public void onStatusChanged(String p,int s,Bundle b){}
    @Override protected void onPause(){super.onPause();resumed=false;skyCamera.stop();sensors.unregisterListener(this);locations.removeUpdates(this);web.onPause();web.pauseTimers();}
    @Override protected void onResume(){super.onResume();resumed=true;if(cameraWanted&&checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED)skyCamera.start();if(web!=null){web.onResume();web.resumeTimers();}if(tracking)new Bridge().track(true);}
    @Override protected void onDestroy(){skyCamera.stop();sensors.unregisterListener(this);locations.removeUpdates(this);web.destroy();super.onDestroy();}
}
