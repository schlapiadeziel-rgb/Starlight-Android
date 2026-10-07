package org.starlight.free;

public final class PreviewGeometryTest {
    private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
    private static void near(double a,double b){check(Math.abs(a-b)<1e-9,a+" != "+b);}
    public static void main(String[] args){
        double vertical=73.73979529168804;
        PreviewGeometry.Result full=PreviewGeometry.cover(640,480,0,640,480,90,vertical);
        near(full.horizontalFov,90);check(full.width==640&&full.height==480,"Uncropped landscape");
        PreviewGeometry.Result portrait=PreviewGeometry.cover(640,480,90,480,640,90,vertical);
        near(portrait.horizontalFov,vertical);check(portrait.width==480&&portrait.height==640,"Rotated axes");
        PreviewGeometry.Result narrow=PreviewGeometry.cover(640,480,90,320,640,90,vertical);
        near(narrow.horizontalFov,53.13010235415598);check(narrow.width==480&&narrow.height==640,"Center crop");
        PreviewGeometry.Result derived=PreviewGeometry.cover(640,480,0,640,480,-1,vertical);
        near(derived.horizontalFov,90);check(derived.source==PreviewGeometry.DERIVED,"One valid axis derives the other");
        derived=PreviewGeometry.cover(640,480,90,480,640,90,-1);
        near(derived.horizontalFov,vertical);check(derived.source==PreviewGeometry.DERIVED,"Missing rotated primary axis");
        PreviewGeometry.Result reported=PreviewGeometry.cover(640,480,90,480,640,-1,vertical);
        check(reported.source==PreviewGeometry.REPORTED,"Do not downgrade the reported primary axis");
        PreviewGeometry.Result fallback=PreviewGeometry.cover(640,480,0,640,480,Double.NaN,-1);
        near(fallback.horizontalFov,45);check(fallback.source==PreviewGeometry.ASSUMED,"Both absent use an explicit assumption");
        int comparisons=0;
        for(int pw:new int[]{640,1280})for(int ph:new int[]{480,720})for(int orientation:new int[]{0,90,180,270})for(int vw:new int[]{320,390,844})for(int vh:new int[]{320,390,844}){
            double sourceFocal=pw/2.0,va=Math.toDegrees(2*Math.atan(ph/(2*sourceFocal)));
            PreviewGeometry.Result result=PreviewGeometry.cover(pw,ph,orientation,vw,vh,90,va);
            check(result.width>=vw&&result.height>=vh,"Preview covers viewport");
            int rotatedWidth=orientation%180==0?pw:ph;
            double cameraFocal=sourceFocal*result.width/rotatedWidth;
            double chartFocal=vw/(2*Math.tan(Math.toRadians(result.horizontalFov/2)));
            for(double ray:new double[]{-.3,0,.25})near(vw/2.0+ray*cameraFocal,vw/2.0+ray*chartFocal);
            check(result.source==PreviewGeometry.REPORTED,"Valid metadata source");comparisons+=3;
        }
        for(int[] bad:new int[][]{{0,480,0,390,844},{640,0,0,390,844},{640,480,45,390,844},{640,480,0,0,844}}){
            boolean threw=false;try{PreviewGeometry.cover(bad[0],bad[1],bad[2],bad[3],bad[4],90,vertical);}catch(IllegalArgumentException expected){threw=true;}check(threw,"Reject invalid dimensions/orientation");
        }
        System.out.println("PASS: reported/derived/assumed view angles, rotation, crop, invalid input and "+comparisons+" camera/chart ray comparisons.");
    }
}
