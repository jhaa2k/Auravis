package com.auravis.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.graphics.BitmapFactory;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;

public class MediaPlaybackService extends Service {
    static final String ACTION_UPDATE = "com.auravis.app.media.UPDATE";
    static final String ACTION_MEDIA_ACTION = "com.auravis.app.media.ACTION";
    private static final String ACTION_STOP = "com.auravis.app.media.STOP";
    private static final String ACTION_PLAY = "com.auravis.app.media.PLAY";
    private static final String ACTION_PAUSE = "com.auravis.app.media.PAUSE";
    private static final String ACTION_PREVIOUS = "com.auravis.app.media.PREVIOUS";
    private static final String ACTION_NEXT = "com.auravis.app.media.NEXT";
    private static final String ACTION_SHUFFLE = "com.auravis.app.media.SHUFFLE";
    private static final String ACTION_REPEAT = "com.auravis.app.media.REPEAT";
    private static final String CHANNEL_ID = "auravis_media";
    private static final int NOTIFICATION_ID = 7102;

    static final String EXTRA_ACTION = "action";
    static final String EXTRA_POSITION = "position";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_ARTIST = "artist";
    static final String EXTRA_ALBUM = "album";
    static final String EXTRA_DURATION = "duration";
    static final String EXTRA_PLAYING = "playing";
    static final String EXTRA_SHUFFLE = "shuffle";
    static final String EXTRA_REPEAT = "repeat";
    private MediaSession mediaSession;
    private NotificationManager notificationManager;
    private PowerManager.WakeLock wakeLock;
    private android.content.BroadcastReceiver noisyReceiver;
    private boolean foregroundStarted;
    private String title = "Auravis";
    private String artist = "";
    private String album = "";
    private long duration;
    private long position;
    private boolean playing;
    private boolean shuffle;
    private boolean repeat;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Auravis:MediaPlayback");
        createNotificationChannel();
        mediaSession = new MediaSession(this, "AuravisMediaSession");
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { dispatchToWeb("play", 0); }
            @Override public void onPause() { dispatchToWeb("pause", 0); }
            @Override public void onStop() { dispatchToWeb("stop", 0); }
            @Override public void onSkipToPrevious() { dispatchToWeb("previous", 0); }
            @Override public void onSkipToNext() { dispatchToWeb("next", 0); }
            @Override public void onSeekTo(long pos) { dispatchToWeb("seek", pos); }
            @Override public void onCustomAction(String action, android.os.Bundle extras) {
                if ("shuffle".equals(action)) dispatchToWeb("shuffle", 0);
                else if ("repeat".equals(action)) dispatchToWeb("repeat", 0);
            }
        });
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setActive(true);
        noisyReceiver = new android.content.BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) dispatchToWeb("pause", 0);
            }
        };
        androidx.core.content.ContextCompat.registerReceiver(
            this,
            noisyReceiver,
            new android.content.IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
            androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED
        );
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopPlaybackService();
            return START_NOT_STICKY;
        }
        if (ACTION_UPDATE.equals(intent.getAction())) {
            title = intent.getStringExtra(EXTRA_TITLE);
            artist = intent.getStringExtra(EXTRA_ARTIST);
            album = intent.getStringExtra(EXTRA_ALBUM);
            duration = intent.getLongExtra(EXTRA_DURATION, 0);
            position = intent.getLongExtra(EXTRA_POSITION, 0);
            playing = intent.getBooleanExtra(EXTRA_PLAYING, false);
            shuffle = intent.getBooleanExtra(EXTRA_SHUFFLE, false);
            repeat = intent.getBooleanExtra(EXTRA_REPEAT, false);
            if (playing && !wakeLock.isHeld()) wakeLock.acquire();
            else if (!playing && wakeLock.isHeld()) wakeLock.release();
            publishSessionState();
            Notification notification = buildNotification();
            if (!foregroundStarted) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
                foregroundStarted = true;
            } else {
                notificationManager.notify(NOTIFICATION_ID, notification);
            }
        } else if (ACTION_PLAY.equals(intent.getAction())) {
            dispatchToWeb("play", 0);
        } else if (ACTION_PAUSE.equals(intent.getAction())) {
            dispatchToWeb("pause", 0);
        } else if (ACTION_PREVIOUS.equals(intent.getAction())) {
            dispatchToWeb("previous", 0);
        } else if (ACTION_NEXT.equals(intent.getAction())) {
            dispatchToWeb("next", 0);
        } else if (ACTION_SHUFFLE.equals(intent.getAction())) {
            dispatchToWeb("shuffle", 0);
        } else if (ACTION_REPEAT.equals(intent.getAction())) {
            dispatchToWeb("repeat", 0);
        }
        return START_NOT_STICKY;
    }

    private void publishSessionState() {
        MediaMetadata metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title == null ? "Unknown track" : title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist == null ? "" : artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, album == null ? "" : album)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, duration)
            .build();
        mediaSession.setMetadata(metadata);

        long stateActions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE |
            PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SEEK_TO |
            PlaybackState.ACTION_STOP;
        int state = playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(stateActions)
            .setState(state, position, playing ? 1f : 0f, SystemClock.elapsedRealtime())
            .setExtras(new android.os.Bundle())
            .addCustomAction("shuffle", shuffle ? "Shuffle on" : "Shuffle off", android.R.drawable.ic_menu_rotate)
            .addCustomAction("repeat", repeat ? "Repeat on" : "Repeat off", android.R.drawable.ic_menu_revert)
            .build());
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = launch == null ? null : PendingIntent.getActivity(
            this, 100, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title == null || title.isEmpty() ? "Unknown track" : title)
            .setContentText(artist == null ? "" : artist)
            .setSubText(album == null || album.isEmpty() ? getString(R.string.app_name) : album)
            .setContentIntent(contentIntent)
            .setLargeIcon(BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher))
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(playing)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));
        builder.addAction(action(R.drawable.ic_media_previous, "Previous", ACTION_PREVIOUS));
        builder.addAction(action(playing ? R.drawable.ic_media_pause : R.drawable.ic_media_play, playing ? "Pause" : "Play", playing ? ACTION_PAUSE : ACTION_PLAY));
        builder.addAction(action(R.drawable.ic_media_next, "Next", ACTION_NEXT));
        builder.addAction(action(R.drawable.ic_media_shuffle, shuffle ? "Turn shuffle off" : "Turn shuffle on", ACTION_SHUFFLE));
        builder.addAction(action(R.drawable.ic_media_repeat, repeat ? "Turn repeat off" : "Turn repeat on", ACTION_REPEAT));
        return builder.build();
    }

    private Notification.Action action(int icon, String label, String action) {
        Intent intent = new Intent(this, MediaPlaybackService.class).setAction(action);
        PendingIntent pending = PendingIntent.getService(this, action.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) return new Notification.Action.Builder(icon, label, pending).build();
        return new Notification.Action(icon, label, pending);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Music playback", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Playback controls for music playing in Auravis");
            channel.setShowBadge(false);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void dispatchToWeb(String action, long seekPosition) {
        Intent intent = new Intent(ACTION_MEDIA_ACTION)
            .setPackage(getPackageName())
            .putExtra(EXTRA_ACTION, action)
            .putExtra(EXTRA_POSITION, seekPosition);
        sendBroadcast(intent);
    }

    private void stopPlaybackService() {
        playing = false;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        stopForeground(true);
        foregroundStarted = false;
        stopSelf();
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (noisyReceiver != null) {
            unregisterReceiver(noisyReceiver);
            noisyReceiver = null;
        }
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
