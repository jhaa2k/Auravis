package com.auravis.app.visualizer.audio

import androidx.media3.common.C
import androidx.media3.common.audio.AudioProcessor
import androidx.media3.common.audio.BaseAudioProcessor
import androidx.media3.common.util.UnstableApi
import java.nio.ByteBuffer

/**
 * Non-destructive PCM tap in the Media3 playback sink.
 * The exact same PCM bytes are forwarded to the speaker after analysis.
 */
@UnstableApi
class AudioAnalysisProcessor(
    private val analyzer: AudioSpectrumAnalyzer
) : BaseAudioProcessor() {

    override fun onConfigure(inputAudioFormat: AudioProcessor.AudioFormat): AudioProcessor.AudioFormat {
        return if (
            inputAudioFormat.encoding == C.ENCODING_PCM_16BIT &&
            inputAudioFormat.channelCount > 0 &&
            inputAudioFormat.sampleRate > 0
        ) inputAudioFormat else AudioProcessor.AudioFormat.NOT_SET
    }

    override fun queueInput(inputBuffer: ByteBuffer) {
        if (!inputBuffer.hasRemaining()) return
        analyzer.acceptPcm16(
            inputBuffer.duplicate(),
            inputAudioFormat.channelCount,
            inputAudioFormat.sampleRate
        )
        val output = replaceOutputBuffer(inputBuffer.remaining())
        output.put(inputBuffer)
        output.flip()
    }

    override fun onFlush(streamMetadata: AudioProcessor.StreamMetadata) {
        analyzer.reset()
    }

    override fun onReset() {
        analyzer.reset()
    }
}
