package com.auravis.app.visualizer.render

import android.content.Context
import android.graphics.PixelFormat
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import com.auravis.app.visualizer.audio.AudioSpectrumAnalyzer
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.max

/** Transparent OpenGL ES 2.0 spectrum surface driven by live Media3 PCM analysis. */
class SpectrumGLView(
    context: Context,
    analyzer: AudioSpectrumAnalyzer,
    private val barCount: Int = 96
) : GLSurfaceView(context) {
    init {
        setEGLContextClientVersion(2)
        setEGLConfigChooser(8, 8, 8, 8, 16, 0)
        holder.setFormat(PixelFormat.TRANSLUCENT)
        setZOrderOnTop(true)
        setRenderer(SpectrumRenderer(analyzer, barCount.coerceIn(8, 256)))
        renderMode = RENDERMODE_CONTINUOUSLY
        isClickable = false
        isFocusable = false
    }
}

private class SpectrumRenderer(
    private val analyzer: AudioSpectrumAnalyzer,
    private val bars: Int
) : GLSurfaceView.Renderer {
    private val vertices = ByteBuffer.allocateDirect(bars * 6 * 6 * 4)
        .order(ByteOrder.nativeOrder()).asFloatBuffer()
    private var program = 0
    private var positionHandle = 0
    private var colorHandle = 0
    private var viewportWidth = 1
    private var viewportHeight = 1

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0f, 0f, 0f, 0f)
        GLES20.glEnable(GLES20.GL_BLEND)
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA)
        val vertexShader = compileShader(GLES20.GL_VERTEX_SHADER, """
            attribute vec2 aPosition;
            attribute vec4 aColor;
            varying vec4 vColor;
            void main() { gl_Position = vec4(aPosition, 0.0, 1.0); vColor = aColor; }
        """.trimIndent())
        val fragmentShader = compileShader(GLES20.GL_FRAGMENT_SHADER, """
            precision mediump float;
            varying vec4 vColor;
            void main() { gl_FragColor = vColor; }
        """.trimIndent())
        program = GLES20.glCreateProgram().also {
            GLES20.glAttachShader(it, vertexShader)
            GLES20.glAttachShader(it, fragmentShader)
            GLES20.glLinkProgram(it)
        }
        val status = IntArray(1)
        GLES20.glGetProgramiv(program, GLES20.GL_LINK_STATUS, status, 0)
        if (status[0] == 0) {
            GLES20.glDeleteProgram(program)
            program = 0
            return
        }
        positionHandle = GLES20.glGetAttribLocation(program, "aPosition")
        colorHandle = GLES20.glGetAttribLocation(program, "aColor")
        GLES20.glDeleteShader(vertexShader)
        GLES20.glDeleteShader(fragmentShader)
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        viewportWidth = max(1, width)
        viewportHeight = max(1, height)
        GLES20.glViewport(0, 0, viewportWidth, viewportHeight)
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        if (program == 0) return
        val frame = analyzer.snapshot(barCount = bars)
        vertices.position(0)
        val step = 2f / bars
        val gap = step * 0.22f
        for (i in 0 until bars) {
            val left = -1f + i * step + gap * 0.5f
            val right = left + step - gap
            val h = frame.bars[i].coerceIn(0f, 1f) * 1.82f
            val bottom = -0.96f
            val top = bottom + h
            val beatLift = frame.beat * 0.18f
            val shade = (0.78f + beatLift).coerceIn(0f, 1f)
            putVertex(left, bottom, shade, shade, shade, 0.94f)
            putVertex(right, bottom, shade, shade, shade, 0.94f)
            putVertex(right, top, shade, shade, shade, 0.94f)
            putVertex(left, bottom, shade, shade, shade, 0.94f)
            putVertex(right, top, shade, shade, shade, 0.94f)
            putVertex(left, top, shade, shade, shade, 0.94f)
        }
        vertices.position(0)
        GLES20.glUseProgram(program)
        GLES20.glEnableVertexAttribArray(positionHandle)
        GLES20.glEnableVertexAttribArray(colorHandle)
        val stride = 6 * 4
        val colorBuffer = vertices.duplicate().apply { position(2) }
        GLES20.glVertexAttribPointer(positionHandle, 2, GLES20.GL_FLOAT, false, stride, vertices)
        GLES20.glVertexAttribPointer(colorHandle, 4, GLES20.GL_FLOAT, false, stride, colorBuffer)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, bars * 6)
        GLES20.glDisableVertexAttribArray(positionHandle)
        GLES20.glDisableVertexAttribArray(colorHandle)
    }

    private fun putVertex(x: Float, y: Float, r: Float, g: Float, b: Float, a: Float) {
        vertices.put(x).put(y).put(r).put(g).put(b).put(a)
    }

    private fun compileShader(type: Int, source: String): Int {
        val shader = GLES20.glCreateShader(type)
        GLES20.glShaderSource(shader, source)
        GLES20.glCompileShader(shader)
        val status = IntArray(1)
        GLES20.glGetShaderiv(shader, GLES20.GL_COMPILE_STATUS, status, 0)
        if (status[0] == 0) {
            val message = GLES20.glGetShaderInfoLog(shader)
            GLES20.glDeleteShader(shader)
            throw IllegalStateException("Spectrum shader compilation failed: $message")
        }
        return shader
    }
}
