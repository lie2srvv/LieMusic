package com.lie.liemusic

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL

class MediaPlaybackService : Service() {
    companion object {
        const val CHANNEL_ID = "liemusic_playback_channel"
        const val NOTIFICATION_ID = 24901

        const val ACTION_UPDATE = "com.lie.liemusic.ACTION_UPDATE"
        const val ACTION_TOGGLE = "com.lie.liemusic.ACTION_TOGGLE"
        const val ACTION_NEXT = "com.lie.liemusic.ACTION_NEXT"
        const val ACTION_PREV = "com.lie.liemusic.ACTION_PREV"
        const val ACTION_STOP = "com.lie.liemusic.ACTION_STOP"

        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_ARTIST = "extra_artist"
        const val EXTRA_COVER_URL = "extra_cover_url"
        const val EXTRA_IS_PLAYING = "extra_is_playing"
        const val EXTRA_POSITION_MS = "extra_position_ms"
        const val EXTRA_DURATION_MS = "extra_duration_ms"
    }

    private lateinit var mediaSession: MediaSessionCompat
    private val mainHandler = Handler(Looper.getMainLooper())
    private var wakeLock: PowerManager.WakeLock? = null

    private var currentTitle = "LieMusic"
    private var currentArtist = "Свободный стриминг"
    private var currentCoverUrl = ""
    private var currentBitmap: Bitmap? = null
    private var isPlaying = false
    private var currentPositionMs = 0L
    private var currentDurationMs = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        initMediaSession()

        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            wakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "LieMusic:PlaybackWakeLock"
            )?.apply {
                setReferenceCounted(false)
            }
        } catch (e: Exception) {
            // Ignore wakelock acquisition failure
        }
    }

    private fun initMediaSession() {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSessionCompat(this, "LieMusicSession").apply {
            setSessionActivity(openAppPendingIntent)
            isActive = true
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    MainActivity.dispatchMediaAction("toggle")
                }

                override fun onPause() {
                    MainActivity.dispatchMediaAction("toggle")
                }

                override fun onSkipToNext() {
                    MainActivity.dispatchMediaAction("next")
                }

                override fun onSkipToPrevious() {
                    MainActivity.dispatchMediaAction("prev")
                }

                override fun onSeekTo(pos: Long) {
                    currentPositionMs = pos
                    MainActivity.dispatchSeekAction(pos / 1000.0)
                    updatePlaybackState()
                }

                override fun onStop() {
                    MainActivity.dispatchMediaAction("toggle")
                }
            })
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Воспроизведение музыки LieMusic",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Элементы управления воспроизведением LieMusic"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: return START_STICKY

        when (action) {
            ACTION_UPDATE -> {
                val newTitle = intent.getStringExtra(EXTRA_TITLE) ?: currentTitle
                val newArtist = intent.getStringExtra(EXTRA_ARTIST) ?: currentArtist
                val newCover = intent.getStringExtra(EXTRA_COVER_URL) ?: ""
                val newIsPlaying = intent.getBooleanExtra(EXTRA_IS_PLAYING, true)
                val newPos = intent.getLongExtra(EXTRA_POSITION_MS, currentPositionMs)
                val newDur = intent.getLongExtra(EXTRA_DURATION_MS, currentDurationMs)

                currentTitle = newTitle
                currentArtist = newArtist
                isPlaying = newIsPlaying
                currentPositionMs = newPos
                currentDurationMs = newDur

                syncWakeLock()

                if (newCover.isNotBlank() && newCover != currentCoverUrl) {
                    loadCoverArt(newCover)
                }

                updateNotification()
            }
            ACTION_TOGGLE -> {
                MainActivity.dispatchMediaAction("toggle")
                isPlaying = !isPlaying
                syncWakeLock()
                updateNotification()
            }
            ACTION_NEXT -> {
                MainActivity.dispatchMediaAction("next")
            }
            ACTION_PREV -> {
                MainActivity.dispatchMediaAction("prev")
            }
            ACTION_STOP -> {
                releaseWakeLock()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }

        return START_STICKY
    }

    private fun syncWakeLock() {
        try {
            if (isPlaying) {
                if (wakeLock?.isHeld != true) {
                    wakeLock?.acquire(3 * 60 * 60 * 1000L) // 3 hours timeout
                }
            } else {
                releaseWakeLock()
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    private fun loadCoverArt(url: String) {
        currentCoverUrl = url
        Thread {
            try {
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.doInput = true
                connection.connectTimeout = 6000
                connection.readTimeout = 6000
                connection.connect()
                val stream = connection.inputStream
                val bitmap = BitmapFactory.decodeStream(stream)
                stream.close()

                if (bitmap != null) {
                    val maxDim = 512
                    val w = bitmap.width
                    val h = bitmap.height
                    val scaled = if (w > maxDim || h > maxDim) {
                        val factor = maxDim.toFloat() / Math.max(w, h)
                        Bitmap.createScaledBitmap(bitmap, (w * factor).toInt(), (h * factor).toInt(), true)
                    } else {
                        bitmap
                    }
                    currentBitmap = scaled
                    mainHandler.post {
                        updateNotification()
                    }
                }
            } catch (e: Exception) {
                // Ignore network art decode failure
            }
        }.start()
    }

    private fun updatePlaybackState() {
        if (!::mediaSession.isInitialized) return

        val state = if (isPlaying) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
        val actions = PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_SEEK_TO or
                PlaybackStateCompat.ACTION_STOP

        val playbackState = PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(state, currentPositionMs, if (isPlaying) 1.0f else 0.0f)
            .build()

        mediaSession.setPlaybackState(playbackState)
    }

    private fun updateMetadata() {
        if (!::mediaSession.isInitialized) return

        val metadataBuilder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "LieMusic")
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, currentDurationMs)

        currentBitmap?.let {
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, it)
            metadataBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, it)
        }

        mediaSession.setMetadata(metadataBuilder.build())
    }

    private fun updateNotification() {
        if (!::mediaSession.isInitialized) return

        updatePlaybackState()
        updateMetadata()

        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val openAppPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val prevIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_PREV }
        val prevPending = PendingIntent.getService(
            this, 1, prevIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val toggleIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_TOGGLE }
        val togglePending = PendingIntent.getService(
            this, 2, toggleIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val nextIntent = Intent(this, MediaPlaybackService::class.java).apply { action = ACTION_NEXT }
        val nextPending = PendingIntent.getService(
            this, 3, nextIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val playPauseIcon = if (isPlaying) {
            android.R.drawable.ic_media_pause
        } else {
            android.R.drawable.ic_media_play
        }
        val playPauseTitle = if (isPlaying) "Пауза" else "Играть"

        val mediaStyle = androidx.media.app.NotificationCompat.MediaStyle()
            .setMediaSession(mediaSession.sessionToken)
            .setShowActionsInCompactView(0, 1, 2)

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFFF97316.toInt())
            .setContentTitle(currentTitle)
            .setContentText(currentArtist)
            .setSubText("LieMusic")
            .setContentIntent(openAppPendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setStyle(mediaStyle)
            .addAction(android.R.drawable.ic_media_previous, "Предыдущий", prevPending)
            .addAction(playPauseIcon, playPauseTitle, togglePending)
            .addAction(android.R.drawable.ic_media_next, "Следующий", nextPending)

        currentBitmap?.let {
            builder.setLargeIcon(it)
        }

        val notification = builder.build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun onDestroy() {
        releaseWakeLock()
        if (::mediaSession.isInitialized) {
            mediaSession.isActive = false
            mediaSession.release()
        }
        super.onDestroy()
    }
}
