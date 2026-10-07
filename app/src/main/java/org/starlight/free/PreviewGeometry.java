package org.starlight.free;

/** Center-cover camera preview geometry. No Android APIs, lens correction or pose calibration. */
final class PreviewGeometry {
    static final int REPORTED=0, DERIVED=1, ASSUMED=2;
    static final class Result {
        final int width,height,source;
        final double horizontalFov;
        Result(int width,int height,double fov,int source){this.width=width;this.height=height;this.horizontalFov=fov;this.source=source;}
    }
    private static boolean valid(double angle){return Double.isFinite(angle)&&angle>=10&&angle<=150;}
    static Result cover(int previewWidth,int previewHeight,int orientation,int viewportWidth,int viewportHeight,double horizontalAngle,double verticalAngle){
        if(previewWidth<=0||previewHeight<=0||viewportWidth<=0||viewportHeight<=0||orientation%90!=0)throw new IllegalArgumentException("Invalid preview geometry");
        boolean swap=Math.floorMod(orientation,180)!=0;
        int pw=swap?previewHeight:previewWidth,ph=swap?previewWidth:previewHeight;
        double angle=swap?verticalAngle:horizontalAngle,other=swap?horizontalAngle:verticalAngle;
        int source=REPORTED;
        if(!valid(angle)){
            if(valid(other)){
                angle=Math.toDegrees(2*Math.atan(Math.tan(Math.toRadians(other/2))*pw/ph));
                source=DERIVED;
            }
            if(!valid(angle)){angle=45;source=ASSUMED;}
        }
        double scale=Math.max((double)viewportWidth/pw,(double)viewportHeight/ph);
        int width=(int)Math.ceil(pw*scale),height=(int)Math.ceil(ph*scale);
        double visible=Math.toDegrees(2*Math.atan(Math.tan(Math.toRadians(angle/2))*viewportWidth/width));
        return new Result(width,height,visible,source);
    }
}
