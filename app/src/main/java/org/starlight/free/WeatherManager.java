package org.starlight.free;

import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** Fetches a small Open-Meteo model forecast on request. No location is sent at app start. */
final class WeatherManager {
    private final UpdateManager.Callback callback;
    private final AtomicBoolean busy=new AtomicBoolean(false);
    WeatherManager(UpdateManager.Callback callback){this.callback=callback;}
    void fetch(double lat,double lon){
        if(!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){sendError("请先设置有效的观测位置");return;}
        if(!busy.compareAndSet(false,true)){sendError("天气请求还在进行中");return;}
        new Thread(()->{
            HttpURLConnection connection=null;
            try{
                String url=String.format(Locale.US,"https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&current=cloud_cover,precipitation,temperature_2m&hourly=cloud_cover,precipitation_probability,visibility&forecast_hours=24&timeformat=unixtime&timezone=UTC",lat,lon);
                connection=(HttpURLConnection)new URL(url).openConnection();
                connection.setConnectTimeout(12000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);
                connection.setRequestProperty("Accept","application/json");connection.setRequestProperty("User-Agent","Starlight-Android-Weather");
                if(connection.getResponseCode()!=200)throw new IOException("weather HTTP error");
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                try(InputStream in=connection.getInputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){if(bytes.size()+n>300000)throw new IOException("weather too large");bytes.write(buffer,0,n);}}
                JSONObject data=new JSONObject(new String(bytes.toByteArray(),"UTF-8")),current=data.getJSONObject("current"),hourly=data.getJSONObject("hourly");
                JSONArray times=hourly.getJSONArray("time"),clouds=hourly.getJSONArray("cloud_cover"),rains=hourly.getJSONArray("precipitation_probability"),sights=hourly.getJSONArray("visibility");
                if(times.length()<1||times.length()!=clouds.length()||times.length()!=rains.length()||times.length()!=sights.length())throw new IOException("weather fields incomplete");
                JSONObject out=new JSONObject();out.put("latitude",data.getDouble("latitude"));out.put("longitude",data.getDouble("longitude"));out.put("retrieved",System.currentTimeMillis());
                out.put("currentTime",current.getLong("time")*1000);out.put("cloud",current.optInt("cloud_cover",-1));out.put("precipitation",current.optDouble("precipitation",-1));out.put("temperature",current.optDouble("temperature_2m",-999));
                JSONArray rows=new JSONArray();long now=System.currentTimeMillis();
                for(int i=0;i<times.length()&&rows.length()<9;i++){
                    long when=times.getLong(i)*1000;if(when<now-3600000)continue;
                    JSONArray row=new JSONArray();row.put(when);row.put(clouds.isNull(i)?-1:clouds.getInt(i));row.put(rains.isNull(i)?-1:rains.getInt(i));row.put(sights.isNull(i)?-1:sights.getInt(i));rows.put(row);
                    i+=2; // roughly three-hour steps: enough detail for the next 24 hours
                }
                out.put("hours",rows);
                callback.send("nativeWeatherResult("+JSONObject.quote(out.toString())+")");
            }catch(Exception e){sendError("无法获取联网天气，请检查网络；离线星图仍可使用");}
            finally{if(connection!=null)connection.disconnect();busy.set(false);}
        },"starlight-weather").start();
    }
    private void sendError(String message){callback.send("nativeWeatherError("+JSONObject.quote(message)+")");}
}
