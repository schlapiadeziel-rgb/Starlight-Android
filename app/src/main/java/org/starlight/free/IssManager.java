package org.starlight.free;

import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.atomic.AtomicBoolean;

/** Explicit, short-lived ISS position snapshots. No observer coordinates leave the device. */
final class IssManager {
    private static final String ENDPOINT="https://api.wheretheiss.at/v1/satellites/25544";
    private final UpdateManager.Callback callback;
    private final AtomicBoolean busy=new AtomicBoolean(false);
    private volatile long lastRequest;
    IssManager(UpdateManager.Callback callback){this.callback=callback;}
    void fetch(){
        long now=System.currentTimeMillis();
        if(now-lastRequest<7000){callback.send("nativeIssError(\"刷新过于频繁，请稍候再试\")");return;}
        if(!busy.compareAndSet(false,true))return;
        lastRequest=now;
        new Thread(()->{
            HttpURLConnection connection=null;
            try{
                connection=(HttpURLConnection)new URL(ENDPOINT).openConnection();
                connection.setConnectTimeout(7000);connection.setReadTimeout(9000);connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("User-Agent","Starlight-Android-ISS");
                if(connection.getResponseCode()!=200)throw new IOException("ISS HTTP error");
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                try(InputStream in=connection.getInputStream()){byte[] buffer=new byte[2048];int n;while((n=in.read(buffer))!=-1){if(bytes.size()+n>16000)throw new IOException("ISS response too large");bytes.write(buffer,0,n);}}
                JSONObject data=new JSONObject(new String(bytes.toByteArray(),"UTF-8"));
                double lat=data.getDouble("latitude"),lon=data.getDouble("longitude"),alt=data.getDouble("altitude"),speed=data.getDouble("velocity");
                long stamp=data.getLong("timestamp")*1000L,age=System.currentTimeMillis()-stamp;
                if(data.getInt("id")!=25544||!"kilometers".equals(data.getString("units"))||!Double.isFinite(lat)||!Double.isFinite(lon)||!Double.isFinite(alt)||!Double.isFinite(speed)||Math.abs(lat)>90||Math.abs(lon)>180||alt<100||alt>1000||speed<0||age< -10000||age>10000)throw new IOException("ISS response invalid or stale");
                JSONObject out=new JSONObject();out.put("latitude",lat);out.put("longitude",lon);out.put("altitude",alt);out.put("velocity",speed);out.put("timestamp",stamp);
                callback.send("nativeIssResult("+JSONObject.quote(out.toString())+")");
            }catch(Exception e){callback.send("nativeIssError(\"无法获取当前 ISS 位置，请检查网络后重试\")");}
            finally{if(connection!=null)connection.disconnect();busy.set(false);}
        },"starlight-iss").start();
    }
}
