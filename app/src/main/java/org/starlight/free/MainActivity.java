package org.starlight.free;

import android.app.Activity;
import android.Manifest;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.hardware.*;
import android.location.*;
import android.webkit.*;
import android.view.WindowManager;
import java.util.Locale;

public class MainActivity extends Activity implements SensorEventListener, LocationListener {
    private WebView web;
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
        web.setBackgroundColor(0xff070d19);
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
        setContentView(web);
        web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets.consumeSystemWindowInsets();});
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
        if(r==5 && g.length>0 && g[0]==PackageManager.PERMISSION_GRANTED)startLocation();
        else js("toast('可以使用手动位置，定位并非必需')");
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
        // Device top edge projected onto sky tangent plane gives screen roll.
        double a=Math.atan2(east,north),h=Math.asin(Math.max(-1,Math.min(1,up)));
        double rx=Math.cos(a),ry=-Math.sin(a);
        double ux=-Math.sin(a)*Math.sin(h),uy=-Math.cos(a)*Math.sin(h),uz=Math.cos(h);
        double roll=Math.atan2(matrix[1]*rx+matrix[4]*ry,matrix[1]*ux+matrix[4]*uy+matrix[7]*uz);
        js(String.format(Locale.US,"nativeOrientation(%.5f,%.5f,%.5f)",az,alt,roll));
    }
    @Override public void onAccuracyChanged(Sensor s,int accuracy){if(accuracy==SensorManager.SENSOR_STATUS_UNRELIABLE)js("toast('指南针需要校准：远离金属，转动手机画 8 字')");}
    @Override public void onProviderEnabled(String p){}
    @Override public void onProviderDisabled(String p){}
    @Override public void onStatusChanged(String p,int s,Bundle b){}
    @Override protected void onPause(){super.onPause();sensors.unregisterListener(this);locations.removeUpdates(this);web.onPause();web.pauseTimers();}
    @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}if(tracking)new Bridge().track(true);}
    @Override protected void onDestroy(){sensors.unregisterListener(this);locations.removeUpdates(this);web.destroy();super.onDestroy();}
}
