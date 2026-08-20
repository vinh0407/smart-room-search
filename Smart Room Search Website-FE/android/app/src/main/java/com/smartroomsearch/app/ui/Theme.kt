package com.smartroomsearch.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Primary = Color(0xFFF97316)
val BackgroundLight = Color(0xFFFAFAF9)
val ForegroundLight = Color(0xFF1C1917)
val CardLight = Color(0xFFFFFFFF)
val MutedLight = Color(0xFFF5F5F4)
val MutedForegroundLight = Color(0xFF78716C)
val BorderLight = Color(0x14000000)

val BackgroundDark = Color(0xFF0C0A09)
val ForegroundDark = Color(0xFFFAFAF9)
val CardDark = Color(0xFF1C1917)
val MutedDark = Color(0xFF292524)
val MutedForegroundDark = Color(0xFFA8A29E)
val BorderDark = Color(0x14FFFFFF)

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    background = BackgroundLight,
    surface = CardLight,
    onBackground = ForegroundLight,
    onSurface = ForegroundLight,
    outline = BorderLight,
    surfaceVariant = MutedLight,
    onSurfaceVariant = MutedForegroundLight
)

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    background = BackgroundDark,
    surface = CardDark,
    onBackground = ForegroundDark,
    onSurface = ForegroundDark,
    outline = BorderDark,
    surfaceVariant = MutedDark,
    onSurfaceVariant = MutedForegroundDark
)

@Composable
fun SmartRoomTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
