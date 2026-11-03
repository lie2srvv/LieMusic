package com.lie.liemusic

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : TauriActivity() {

  companion object {
    private var webViewRef: WebView? = null

    fun dispatchMediaAction(action: String) {
      webViewRef?.post {
        webViewRef?.evaluateJavascript(
          "window.dispatchEvent(new CustomEvent('android_media_action', { detail: '$action' }));",
          null
        )
      }
    }

    fun dispatchSeekAction(seconds: Double) {
      webViewRef?.post {
        webViewRef?.evaluateJavascript(
          "window.dispatchEvent(new CustomEvent('android_media_seek', { detail: $seconds }));",
          null
        )
      }
    }
  }

  inner class MediaNotificationBridge(private val context: Context) {
    @JavascriptInterface
    fun updateState(
      title: String,
      artist: String,
      coverUrl: String,
      isPlaying: Boolean,
      positionMs: Long,
      durationMs: Long
    ) {
      val intent = Intent(context, MediaPlaybackService::class.java).apply {
        action = MediaPlaybackService.ACTION_UPDATE
        putExtra(MediaPlaybackService.EXTRA_TITLE, title)
        putExtra(MediaPlaybackService.EXTRA_ARTIST, artist)
        putExtra(MediaPlaybackService.EXTRA_COVER_URL, coverUrl)
        putExtra(MediaPlaybackService.EXTRA_IS_PLAYING, isPlaying)
        putExtra(MediaPlaybackService.EXTRA_POSITION_MS, positionMs)
        putExtra(MediaPlaybackService.EXTRA_DURATION_MS, durationMs)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    @JavascriptInterface
    fun stop() {
      val intent = Intent(context, MediaPlaybackService::class.java).apply {
        action = MediaPlaybackService.ACTION_STOP
      }
      context.startService(intent)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Request Notification permission for Android 13+ (API 33+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
          != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(
          this,
          arrayOf(Manifest.permission.POST_NOTIFICATIONS),
          101
        )
      }
    }
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webViewRef = webView
    webView.settings.mediaPlaybackRequiresUserGesture = false
    webView.settings.domStorageEnabled = true
    webView.settings.databaseEnabled = true
    webView.addJavascriptInterface(MediaNotificationBridge(this), "AndroidMediaNotification")
  }

  // CRITICAL: Overriding onPause and onStop to prevent WebView from halting audio playback when app is minimized!
  override fun onPause() {
    // Only notify plugin manager, do NOT call mWebView.onPause() which kills background music!
    getPluginManager().onPause(this)
  }

  override fun onStop() {
    // Do not freeze webview
    getPluginManager().onStop(this)
  }
}
