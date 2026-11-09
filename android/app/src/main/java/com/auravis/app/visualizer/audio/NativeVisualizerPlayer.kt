package com.auravis.app.visualizer.audio

import android.content.Context
import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink

/**
 * Native playback source for the visualizer engine.
 * Build a fresh processor and audio sink for each player instance.
 */
@UnstableApi
class NativeVisualizerPlayer(context: Context) {
    val analyzer = AudioSpectrumAnalyzer()
    private val processor = AudioAnalysisProcessor(analyzer)
    private val renderersFactory = object : DefaultRenderersFactory(context) {
        override fun buildAudioSink(
            context: Context,
            enableFloatOutput: Boolean,
            enableAudioOutputPlaybackParams: Boolean
        ): AudioSink {
            return DefaultAudioSink.Builder(context)
                .setEnableFloatOutput(false)
                .setAudioProcessors(arrayOf(processor))
                .build()
        }
    }

    val player: ExoPlayer = ExoPlayer.Builder(context, renderersFactory).build()

    fun load(uri: Uri, autoplay: Boolean = true) {
        player.setMediaItem(MediaItem.fromUri(uri))
        player.prepare()
        player.playWhenReady = autoplay
    }

    fun release() {
        player.release()
        analyzer.reset()
    }
}
