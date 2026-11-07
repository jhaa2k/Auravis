package com.auravis.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativeMedia",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class NativeMediaPlugin extends Plugin {
    private BroadcastReceiver actionReceiver;

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter(MediaPlaybackService.ACTION_MEDIA_ACTION);
        actionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                JSObject event = new JSObject();
                event.put("action", intent.getStringExtra(MediaPlaybackService.EXTRA_ACTION));
                event.put("position", intent.getLongExtra(MediaPlaybackService.EXTRA_POSITION, 0) / 1000.0);
                event.put("focusLoss", intent.getBooleanExtra(MediaPlaybackService.EXTRA_PAUSED_FOR_FOCUS, false));
                notifyListeners("mediaAction", event);
            }
        };
        ContextCompat.registerReceiver(getContext(), actionReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @PluginMethod
    public void updateMedia(PluginCall call) {
        if (!call.getBoolean("hasAudio", false)) {
            getContext().stopService(new Intent(getContext(), MediaPlaybackService.class));
            call.resolve();
            return;
        }
        Intent intent = new Intent(getContext(), MediaPlaybackService.class)
            .setAction(MediaPlaybackService.ACTION_UPDATE)
            .putExtra(MediaPlaybackService.EXTRA_TITLE, call.getString("title", "Unknown track"))
            .putExtra(MediaPlaybackService.EXTRA_ARTIST, call.getString("artist", ""))
            .putExtra(MediaPlaybackService.EXTRA_ALBUM, call.getString("album", ""))
            .putExtra(MediaPlaybackService.EXTRA_DURATION, Math.max(0L, (long) (call.getDouble("duration", 0.0) * 1000)))
            .putExtra(MediaPlaybackService.EXTRA_POSITION, Math.max(0L, (long) (call.getDouble("position", 0.0) * 1000)))
            .putExtra(MediaPlaybackService.EXTRA_PLAYING, call.getBoolean("playing", false))
            .putExtra(MediaPlaybackService.EXTRA_SHUFFLE, call.getBoolean("shuffle", false))
            .putExtra(MediaPlaybackService.EXTRA_REPEAT, call.getBoolean("repeat", false))
            .putExtra(MediaPlaybackService.EXTRA_PAUSED_FOR_FOCUS, call.getBoolean("pausedForFocus", false));
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ContextCompat.startForegroundService(getContext(), intent);
            else getContext().startService(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not start the Android media session: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        result.put("granted", granted);
        call.resolve(result);
    }

    @Override
    protected void handleOnDestroy() {
        if (actionReceiver != null) {
            getContext().unregisterReceiver(actionReceiver);
            actionReceiver = null;
        }
        super.handleOnDestroy();
    }
}
