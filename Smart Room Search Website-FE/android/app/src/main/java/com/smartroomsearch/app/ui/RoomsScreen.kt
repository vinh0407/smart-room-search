package com.smartroomsearch.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartroomsearch.app.model.Room

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsScreen(viewModel: MainViewModel, onRoomClick: (Int) -> Unit) {
    val rooms by viewModel.rooms.collectAsState()
    val favorites by viewModel.favorites.collectAsState()
    var selectedDistrict by remember { mutableStateOf("Tất cả") }

    val filteredRooms = if (selectedDistrict == "Tất cả") {
        rooms
    } else {
        rooms.filter { it.district == selectedDistrict }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Danh sách phòng", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Settings, null)
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            ScrollableTabRow(
                selectedTabIndex = 0,
                edgePadding = 16.dp,
                divider = {},
                containerColor = MaterialTheme.colorScheme.background
            ) {
                val districts = listOf("Tất cả", "Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Tân Bình")
                districts.forEach { district ->
                    FilterTab(
                        text = district,
                        selected = selectedDistrict == district,
                        onClick = { selectedDistrict = district }
                    )
                }
            }

            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(filteredRooms) { room ->
                    RoomCard(
                        room = room,
                        isFavorite = favorites.any { it.id == room.id },
                        onFavoriteClick = { viewModel.toggleFavorite(room) },
                        onClick = { onRoomClick(room.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun FilterTab(text: String, selected: Boolean, onClick: () -> Unit) {
    val containerColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
    
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = containerColor, contentColor = contentColor),
        modifier = Modifier.padding(horizontal = 4.dp, vertical = 8.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(text, fontSize = 12.sp)
    }
}
