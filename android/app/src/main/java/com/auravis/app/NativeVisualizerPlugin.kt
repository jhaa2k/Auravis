package com.auravis.app

import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResult
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.auravis.app.visualizer.audio.NativeVisualizerPlayer

@UnstableApi
@CapacitorPlugin(name = "NativeVisualizer")
class NativeVisualizerPlugin : Plugin() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var engine: NativeVisualizerPlayer? = null
    private var listenerAttached = false
    private var spectrumActive = false

    private val spectrumTicker = object : Runnable {
        override fun run() {
            val current = engine
            if (!spectrumActive || current == null) return
            val frame = current.analyzer.snapshot(barCount = 96)
            val bars = JSArray()
            frame.bars.forEach { bars.put(it.toDouble()) }
            val event = JSObject()
            event.put("bars", bars)
            event.put("bass", frame.bass.toDouble())
            event.put("mid", frame.mid.toDouble())
            event.put("treble", frame.treble.toDouble())
            event.put("beat", frame.beat.toDouble())
            event.put("level", frame.level.toDouble())
            event.put("sampleRate", frame.sampleRate)
            notifyListeners("nativeSpectrum", event)
            if (current.player.isPlaying) mainHandler.postDelayed(this, 33L)
            else spectrumActive = false
        }
    }

    @PluginMethod
    fun pickAudio(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType("audio/*")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
        startActivityForResult(call, intent, "audioPickerResult")
    }

    @ActivityCallback
    private fun audioPickerResult(call: PluginCall, result: ActivityResult) {
        if (result.resultCode != android.app.Activity.RESULT_OK || result.data?.data == null) {
            call.reject("No audio file was selected.")
            return
        }
        val uri = result.data!!.data!!
        try {
            val flags = result.data!!.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION
            if (flags != 0) context.contentResolver.takePersistableUriPermission(uri, flags)
        } catch (_: SecurityException) {
            // Some document providers issue temporary rather than persistable grants.
        }
        val name = queryDisplayName(uri) ?: "Audio track"
        val mime = context.contentResolver.getType(uri) ?: "audio/*"
        val response = JSObject()
        response.put("uri", uri.toString())
        response.put("name", name)
        response.put("mimeType", mime)
        call.resolve(response)
    }

    @PluginMethod
    fun load(call: PluginCall) {
        val rawUri = call.getString("uri")
        if (rawUri.isNullOrBlank()) {
            call.reject("A valid content URI is required.")
            return
        }
        try {
            val current = ensureEngine()
            current.load(Uri.parse(rawUri), call.getBoolean("autoplay", false) == true)
            startSpectrumTicker()
            resolveState(call)
        } catch (error: Exception) {
            call.reject("Could not load audio: ${error.message}", error)
        }
    }

    @PluginMethod
    fun play(call: PluginCall) {
        val current = engine
        if (current == null) {
            call.reject("Load an audio track first.")
            return
        }
        current.player.play()
        startSpectrumTicker()
        resolveState(call)
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        engine?.player?.pause()
        spectrumActive = false
        mainHandler.removeCallbacks(spectrumTicker)
        resolveState(call)
    }

    @PluginMethod
    fun seek(call: PluginCall) {
        val position = call.getDouble("position", 0.0).coerceAtLeast(0.0)
        engine?.player?.seekTo((position * 1000.0).toLong())
        resolveState(call)
    }

    @PluginMethod
    fun setVolume(call: PluginCall) {
        val value = call.getDouble("volume", 1.0).toFloat().coerceIn(0f, 1f)
        engine?.player?.volume = value
        call.resolve()
    }

    @PluginMethod
    fun getState(call: PluginCall) = resolveState(call)

    @PluginMethod
    fun release(call: PluginCall) {
        spectrumActive = false
        mainHandler.removeCallbacks(spectrumTicker)
        engine?.release()
        engine = null
        listenerAttached = false
        call.resolve()
    }

    private fun ensureEngine(): NativeVisualizerPlayer {
        val existing = engine
        if (existing != null) return existing
        val created = NativeVisualizerPlayer(context)
        created.player.addListener(object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                val state = JSObject()
                state.put("playing", isPlaying)
                state.put("position", created.player.currentPosition / 1000.0)
                state.put("duration", (created.player.duration.coerceAtLeast(0L)) / 1000.0)
                state.put("state", created.player.playbackState)
                notifyListeners("nativePlaybackState", state)
                if (isPlaying) startSpectrumTicker()
                else {
                    spectrumActive = false
                    mainHandler.removeCallbacks(spectrumTicker)
                }
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                val state = JSObject()
                state.put("playing", created.player.isPlaying)
                state.put("position", created.player.currentPosition / 1000.0)
                state.put("duration", (created.player.duration.coerceAtLeast(0L)) / 1000.0)
                state.put("state", playbackState)
                notifyListeners("nativePlaybackState", state)
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                val event = JSObject()
                event.put("message", error.message ?: "Native audio playback failed.")
                event.put("errorCode", error.errorCode)
                notifyListeners("nativePlaybackError", event)
            }
        })
        engine = created
        listenerAttached = true
        return created
    }

    private fun startSpectrumTicker() {
        if (spectrumActive) return
        spectrumActive = true
        mainHandler.removeCallbacks(spectrumTicker)
        mainHandler.post(spectrumTicker)
    }

    private fun resolveState(call: PluginCall) {
        val player = engine?.player
        val state = JSObject()
        state.put("playing", player?.isPlaying == true)
        state.put("position", (player?.currentPosition ?: 0L) / 1000.0)
        state.put("duration", ((player?.duration ?: 0L).coerceAtLeast(0L)) / 1000.0)
        state.put("playbackState", player?.playbackState ?: Player.STATE_IDLE)
        call.resolve(state)
    }

    private fun queryDisplayName(uri: Uri): String? {
        return context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        }
    }

    override fun handleOnDestroy() {
        spectrumActive = false
        mainHandler.removeCallbacks(spectrumTicker)
        engine?.release()
        engine = null
        super.handleOnDestroy()
    }
}
