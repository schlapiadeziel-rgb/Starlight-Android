package org.starlight.free;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** Updates are fetched only after a tap; Android's installer always asks for final consent. */
final class UpdateManager {
    interface Callback { void send(String javascript); }
    private static final String RELEASES="https://api.github.com/repos/schlapiadeziel-rgb/Starlight-Android/releases?per_page=15";
    private static final String DOWNLOAD_PREFIX="https://github.com/schlapiadeziel-rgb/Starlight-Android/releases/download/";
    private static final long MAX_BYTES=60L*1024*1024;
    private final Activity activity;
    private final Callback callback;
    private final AtomicBoolean busy=new AtomicBoolean(false);
    private volatile UpdateInfo available;
    private volatile File verifiedApk;

    private static final class UpdateInfo {
        final String version,url,digest;
        final long size;
        UpdateInfo(String version,String url,String digest,long size){this.version=version;this.url=url;this.digest=digest;this.size=size;}
    }
    UpdateManager(Activity activity,Callback callback){this.activity=activity;this.callback=callback;}
    private void say(String name,String... args){StringBuilder js=new StringBuilder(name).append('(');for(int i=0;i<args.length;i++){if(i>0)js.append(',');js.append(JSONObject.quote(args[i]));}callback.send(js.append(')').toString());}
    private static int[] version(String text){
        if(text==null||!text.matches("v?[0-9]+\\.[0-9]+\\.[0-9]+"))return null;
        String[] parts=text.replaceFirst("^v","").split("\\.");
        try{return new int[]{Integer.parseInt(parts[0]),Integer.parseInt(parts[1]),Integer.parseInt(parts[2])};}catch(NumberFormatException e){return null;}
    }
    private static int compare(int[] a,int[] b){for(int i=0;i<3;i++)if(a[i]!=b[i])return Integer.compare(a[i],b[i]);return 0;}
    private static boolean allowed(URL url){String host=url.getHost().toLowerCase(Locale.ROOT);return "https".equalsIgnoreCase(url.getProtocol())&&(host.equals("github.com")||host.equals("api.github.com")||host.endsWith(".githubusercontent.com"));}
    private static HttpURLConnection connect(String address) throws IOException {
        URL url=new URL(address);
        for(int redirect=0;redirect<6;redirect++){
            if(!allowed(url))throw new IOException("unexpected download host");
            HttpURLConnection c=(HttpURLConnection)url.openConnection();c.setConnectTimeout(12000);c.setReadTimeout(20000);c.setInstanceFollowRedirects(false);
            c.setRequestProperty("User-Agent","Starlight-Android-Updater");c.setRequestProperty("Accept","application/vnd.github+json");
            int code=c.getResponseCode();
            if(code==200)return c;
            if(code==301||code==302||code==303||code==307||code==308){String location=c.getHeaderField("Location");c.disconnect();if(location==null)throw new IOException("missing redirect");url=new URL(url,location);continue;}
            c.disconnect();throw new IOException("HTTP "+code);
        }
        throw new IOException("too many redirects");
    }
    private static byte[] readSmall(InputStream in,int max) throws IOException {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] chunk=new byte[8192];int n;
        while((n=in.read(chunk))!=-1){if(out.size()+n>max)throw new IOException("response too large");out.write(chunk,0,n);}return out.toByteArray();
    }
    private static String hex(byte[] bytes){char[] digits="0123456789abcdef".toCharArray(),out=new char[bytes.length*2];for(int i=0;i<bytes.length;i++){out[i*2]=digits[(bytes[i]&255)>>4];out[i*2+1]=digits[bytes[i]&15];}return new String(out);}
    void check(){
        if(!busy.compareAndSet(false,true)){say("nativeUpdateError","当前操作尚未结束");return;}
        new Thread(()->{
            try{
                PackageInfo current=activity.getPackageManager().getPackageInfo(activity.getPackageName(),0);
                int[] currentVersion=version(current.versionName);
                if(currentVersion==null)throw new IOException("invalid current version");
                HttpURLConnection c=connect(RELEASES);JSONArray releases;
                try(InputStream in=c.getInputStream()){releases=new JSONArray(new String(readSmall(in,1024*1024),"UTF-8"));}finally{c.disconnect();}
                UpdateInfo best=null;int[] bestVersion=currentVersion;
                for(int i=0;i<releases.length();i++){
                    JSONObject release=releases.optJSONObject(i);if(release==null||release.optBoolean("draft"))continue;
                    String tag=release.optString("tag_name");int[] next=version(tag);
                    if(next==null||compare(next,bestVersion)<=0)continue;
                    JSONArray assets=release.optJSONArray("assets");if(assets==null)continue;
                    for(int j=0;j<assets.length();j++){
                        JSONObject asset=assets.optJSONObject(j);if(asset==null)continue;
                        String name=asset.optString("name"),url=asset.optString("browser_download_url"),digest=asset.optString("digest");long size=asset.optLong("size");
                        if(name.matches("Starlight-[A-Za-z0-9._-]+\\.apk")&&url.startsWith(DOWNLOAD_PREFIX+tag+"/")&&digest.matches("sha256:[0-9a-f]{64}")&&size>0&&size<=MAX_BYTES){best=new UpdateInfo(tag,url,digest.substring(7),size);bestVersion=next;break;}
                    }
                }
                if(best==null||available==null||!best.version.equals(available.version))verifiedApk=null;
                available=best;
                if(best==null)say("nativeUpdateCurrent",current.versionName);
                else say("nativeUpdateAvailable",current.versionName,best.version,String.valueOf(best.size));
            }catch(Exception e){say("nativeUpdateError","无法检查更新，请确认网络可访问 GitHub 后重试");}
            finally{busy.set(false);}
        },"starlight-update-check").start();
    }
    void download(){
        UpdateInfo info=available;
        if(info==null){say("nativeUpdateError","请先检查更新");return;}
        if(!busy.compareAndSet(false,true)){say("nativeUpdateError","当前操作尚未结束");return;}
        new Thread(()->{
            File directory=new File(activity.getCacheDir(),"updates"),temp=new File(directory,"starlight-update.partial.apk"),apk=new File(directory,"starlight-update.apk");
            try{
                if(!directory.isDirectory()&&!directory.mkdirs())throw new IOException("cache unavailable");
                MessageDigest sha=MessageDigest.getInstance("SHA-256");long count=0;int lastPercent=-1;
                HttpURLConnection c=connect(info.url);
                try(InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(temp)){
                    byte[] buf=new byte[16384];int n;
                    while((n=in.read(buf))!=-1){count+=n;if(count>MAX_BYTES||count>info.size)throw new IOException("APK too large");sha.update(buf,0,n);out.write(buf,0,n);int percent=(int)(count*100/info.size);if(percent/5!=lastPercent/5){lastPercent=percent;say("nativeUpdateProgress",String.valueOf(percent));}}
                }finally{c.disconnect();}
                if(count!=info.size||!hex(sha.digest()).equals(info.digest))throw new IOException("digest mismatch");
                PackageManager pm=activity.getPackageManager();
                PackageInfo installed=pm.getPackageInfo(activity.getPackageName(),PackageManager.GET_SIGNATURES);
                PackageInfo candidate=pm.getPackageArchiveInfo(temp.getAbsolutePath(),PackageManager.GET_SIGNATURES);
                if(candidate==null||!activity.getPackageName().equals(candidate.packageName)||candidate.versionCode<=installed.versionCode||candidate.signatures==null||installed.signatures==null||candidate.signatures.length!=1||installed.signatures.length!=1||!MessageDigest.isEqual(candidate.signatures[0].toByteArray(),installed.signatures[0].toByteArray()))throw new IOException("package or signing certificate mismatch");
                if(apk.exists()&&!apk.delete())throw new IOException("old download unavailable");
                if(!temp.renameTo(apk))throw new IOException("cache move failed");
                verifiedApk=apk;say("nativeUpdateReady",info.version);
            }catch(Exception e){temp.delete();say("nativeUpdateError","下载或校验失败，请稍后重试；不会安装未经验证的文件");}
            finally{busy.set(false);}
        },"starlight-update-download").start();
    }
    void install(){
        File file=verifiedApk;
        if(file==null||!file.isFile()){say("nativeUpdateError","请先下载并校验安装包");return;}
        try{
            if(!activity.getPackageManager().canRequestPackageInstalls()){
                Intent settings=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName()));
                activity.startActivity(settings);say("nativeUpdatePermission");return;
            }
            Uri uri=Uri.parse("content://"+activity.getPackageName()+".updates/starlight-update.apk");
            Intent intent=new Intent(Intent.ACTION_INSTALL_PACKAGE);
            intent.setData(uri);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(ClipData.newRawUri("Starlight APK",uri));
            activity.startActivity(intent);
        }catch(Exception e){say("nativeUpdateError","无法打开系统安装界面，可从 GitHub 发布页手动安装");}
    }
    boolean hasVerifiedUpdate(){return verifiedApk!=null&&verifiedApk.isFile();}
}
