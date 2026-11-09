package com.auravis.app.visualizer.audio

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.sin
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioSpectrumAnalyzerTest {
    @Test
    fun pcmToneProducesLiveSpectrumAndBandEnergy() {
        val analyzer = AudioSpectrumAnalyzer(2048)
        val rate = 44100
        val frames = 8192
        val pcm = ByteBuffer.allocateDirect(frames * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (i in 0 until frames) {
            val sample = (sin(2.0 * PI * 440.0 * i / rate) * 22000.0).toInt()
            pcm.putShort(sample.toShort())
        }
        pcm.flip()

        analyzer.acceptPcm16(pcm, channelCount = 1, rate = rate)
        val frame = analyzer.snapshot(barCount = 64, lowHz = 30f, highHz = 16000f)

        assertTrue("Expected non-zero spectrum bars", (frame.bars.maxOrNull() ?: 0f) > 0.05f)
        assertTrue("440 Hz should register in bass band", frame.bass > 0.01f)
        assertTrue("RMS level should be non-zero", frame.level > 0.01f)
        assertTrue("Spectrum must remain normalized", frame.bars.all { it in 0f..1f })
    }

    @Test
    fun emptyInputProducesSilentFrame() {
        val frame = AudioSpectrumAnalyzer().snapshot()
        assertTrue(frame.level == 0f)
        assertTrue(frame.bars.all { it == 0f })
    }
}
