package com.auravis.app.visualizer.audio

import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sqrt

data class SpectrumFrame(
    val bars: FloatArray,
    val magnitudes: FloatArray,
    val bass: Float,
    val mid: Float,
    val treble: Float,
    val beat: Float,
    val level: Float,
    val sampleRate: Int,
    val timestampNanos: Long
)

/**
 * Thread-safe PCM analyser. Audio is tapped from the app's Media3 playback path;
 * it never records the microphone or captures audio from other applications.
 */
class AudioSpectrumAnalyzer(private val fftSize: Int = 2048) {
    init {
        require(fftSize >= 256 && (fftSize and (fftSize - 1)) == 0) {
            "FFT size must be a power of two and at least 256"
        }
    }

    private val ring = FloatArray(fftSize * 4)
    private var writeIndex = 0
    private var samplesWritten = 0L
    private var sampleRate = 44100

    private val real = FloatArray(fftSize)
    private val imag = FloatArray(fftSize)
    private val window = FloatArray(fftSize) { i ->
        (0.5 - 0.5 * cos(2.0 * PI * i / (fftSize - 1))).toFloat()
    }
    private val magnitudes = FloatArray(fftSize / 2)
    private val previousMagnitudes = FloatArray(fftSize / 2)
    private var smoothedBars = FloatArray(96)
    private var beatBaseline = 0f
    private var bassBaseline = 0f
    private var beatValue = 0f
    private var previousSnapshotNs = 0L

    /** Called on Media3's audio processing thread. Input is signed 16-bit interleaved PCM. */
    @Synchronized
    fun acceptPcm16(input: ByteBuffer, channelCount: Int, rate: Int) {
        if (channelCount <= 0 || rate <= 0) return
        sampleRate = rate
        val pcm = input.duplicate().order(ByteOrder.LITTLE_ENDIAN)
        val frameBytes = channelCount * 2
        while (pcm.remaining() >= frameBytes) {
            var sum = 0f
            repeat(channelCount) {
                sum += pcm.short.toFloat() / 32768f
            }
            ring[writeIndex] = (sum / channelCount).coerceIn(-1f, 1f)
            writeIndex = (writeIndex + 1) % ring.size
            samplesWritten++
        }
    }

    @Synchronized
    fun snapshot(
        barCount: Int = 96,
        lowHz: Float = 30f,
        highHz: Float = 16000f,
        smoothing: Float = 0.72f
    ): SpectrumFrame {
        val count = barCount.coerceIn(8, 512)
        if (smoothedBars.size != count) smoothedBars = FloatArray(count)

        val now = System.nanoTime()
        val dt = if (previousSnapshotNs == 0L) 1f / 60f
            else ((now - previousSnapshotNs) / 1_000_000_000f).coerceIn(1f / 240f, 0.1f)
        previousSnapshotNs = now

        val available = min(samplesWritten, fftSize.toLong()).toInt()
        val pad = fftSize - available
        var sumSquares = 0f
        for (i in 0 until fftSize) {
            val sample = if (i < pad) 0f else {
                val offset = (writeIndex - available + (i - pad) + ring.size) % ring.size
                ring[offset]
            }
            real[i] = sample * window[i]
            imag[i] = 0f
            if (i >= fftSize - min(available, 2048)) sumSquares += sample * sample
        }

        fft()
        val scale = 2f / window.sum().coerceAtLeast(1f)
        for (i in magnitudes.indices) {
            magnitudes[i] = sqrt(real[i] * real[i] + imag[i] * imag[i]) * scale
        }

        val nyquist = sampleRate * 0.5f
        val minHz = lowHz.coerceIn(10f, nyquist * 0.95f)
        val maxHz = highHz.coerceIn(minHz + 1f, nyquist)
        val binHz = sampleRate.toFloat() / fftSize

        for (i in 0 until count) {
            val a = minHz * (maxHz / minHz).pow(i.toFloat() / count)
            val b = minHz * (maxHz / minHz).pow((i + 1f) / count)
            val first = floor(a / binHz).toInt().coerceIn(0, magnitudes.lastIndex)
            val last = floor(max(a, b - 0.01f) / binHz).toInt().coerceIn(first, magnitudes.lastIndex)
            var peak = 0f
            for (bin in first..last) peak = max(peak, magnitudes[bin])
            val target = (sqrt(peak.coerceAtLeast(0f)) * 2.4f).coerceIn(0f, 1f)
            val attack = 1f - smoothing.coerceIn(0f, 0.98f).pow(dt * 60f * 2.4f)
            val release = 1f - smoothing.coerceIn(0f, 0.98f).pow(dt * 60f * 0.75f)
            val alpha = if (target > smoothedBars[i]) attack else release
            smoothedBars[i] += (target - smoothedBars[i]) * alpha
        }

        fun band(fromHz: Float, toHz: Float): Float {
            val first = floor(fromHz / binHz).toInt().coerceIn(0, magnitudes.lastIndex)
            val last = floor(toHz / binHz).toInt().coerceIn(first, magnitudes.lastIndex)
            var energy = 0f
            for (i in first..last) energy += magnitudes[i] * magnitudes[i]
            return (sqrt(energy / (last - first + 1)) * 5f).coerceIn(0f, 1f)
        }

        var flux = 0f
        for (i in magnitudes.indices) {
            flux += max(0f, magnitudes[i] - previousMagnitudes[i])
            previousMagnitudes[i] = magnitudes[i]
        }
        flux /= magnitudes.size
        val bass = band(20f, min(250f, nyquist))
        val mid = band(250f, min(4000f, nyquist))
        val treble = band(4000f, nyquist)
        val bassFlux = max(0f, bass - bassBaseline)
        bassBaseline += (bass - bassBaseline) * (1f - 0.985f.pow(dt * 60f))
        val onset = max(flux * 18f, bassFlux * 1.8f)
        val threshold = (beatBaseline * 1.55f + 0.012f).coerceAtLeast(0.018f)
        val rawBeat = if (onset > threshold) ((onset - threshold) / 0.12f).coerceIn(0f, 1f) else 0f
        beatBaseline += (onset - beatBaseline) * (1f - 0.97f.pow(dt * 60f))
        val beatAttack = 1f - 0.08f.pow(dt * 60f)
        val beatRelease = 0.78f.pow(dt * 60f)
        beatValue = if (rawBeat > beatValue) beatValue + (rawBeat - beatValue) * beatAttack
            else max(rawBeat, beatValue * beatRelease)

        val rms = if (available == 0) 0f else sqrt(sumSquares / min(available, 2048))
        val level = (rms * 2.2f).coerceIn(0f, 1f)
        return SpectrumFrame(smoothedBars.copyOf(), magnitudes.copyOf(), bass, mid, treble, beatValue, level, sampleRate, now)
    }

    private fun fft() {
        val n = fftSize
        var j = 0
        for (i in 1 until n) {
            var bit = n shr 1
            while (j and bit != 0) {
                j = j xor bit
                bit = bit shr 1
            }
            j = j xor bit
            if (i < j) {
                val tr = real[i]; real[i] = real[j]; real[j] = tr
                val ti = imag[i]; imag[i] = imag[j]; imag[j] = ti
            }
        }

        var size = 2
        while (size <= n) {
            val half = size shr 1
            val angle = -2.0 * PI / size
            val stepCos = cos(angle).toFloat()
            val stepSin = kotlin.math.sin(angle).toFloat()
            var base = 0
            while (base < n) {
                var wr = 1f
                var wi = 0f
                for (k in 0 until half) {
                    val even = base + k
                    val odd = even + half
                    val tr = wr * real[odd] - wi * imag[odd]
                    val ti = wr * imag[odd] + wi * real[odd]
                    real[odd] = real[even] - tr
                    imag[odd] = imag[even] - ti
                    real[even] += tr
                    imag[even] += ti
                    val nextWr = wr * stepCos - wi * stepSin
                    wi = wr * stepSin + wi * stepCos
                    wr = nextWr
                }
                base += size
            }
            size = size shl 1
        }
    }

    @Synchronized
    fun reset() {
        ring.fill(0f)
        magnitudes.fill(0f)
        previousMagnitudes.fill(0f)
        smoothedBars.fill(0f)
        writeIndex = 0
        samplesWritten = 0
        beatBaseline = 0f
        bassBaseline = 0f
        beatValue = 0f
        previousSnapshotNs = 0L
    }
}
