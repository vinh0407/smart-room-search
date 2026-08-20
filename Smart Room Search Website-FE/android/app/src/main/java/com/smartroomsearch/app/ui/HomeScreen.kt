package com.smartroomsearch.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

@Composable
fun HomeScreen(viewModel: MainViewModel, onRoomClick: (Int) -> Unit) {
    val rooms by viewModel.rooms.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val favorites by viewModel.favorites.collectAsState()
    
    var searchQuery by remember { mutableStateOf("") }
    var selectedDistrict by remember { mutableStateOf("Tất cả") }

    val filteredRooms = rooms.filter {
        (selectedDistrict == "Tất cả" || it.district == selectedDistrict) &&
        (searchQuery.isEmpty() || it.title.contains(searchQuery, ignoreCase = true) || it.address.contains(searchQuery, ignoreCase = true))
    }

    Scaffold(
        topBar = {
            Column(Modifier.background(MaterialTheme.colorScheme.surface).padding(bottom = 8.dp)) {
                HomeTopBar(searchQuery) { searchQuery = it }
                DistrictFilter(selectedDistrict) { selectedDistrict = it }
            }
        }
    ) { padding ->
        if (isLoading && rooms.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                item { HeroSection() }
                
                item {
                    SectionHeader("Phòng nổi bật")
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(filteredRooms.filter { it.isFeatured }) { room ->
                            Box(modifier = Modifier.width(280.dp)) {
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

                item {
                    SectionHeader("Mới đăng")
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        filteredRooms.filter { it.isNew }.take(10).forEach { room ->
                            RoomCard(
                                room = room,
                                isFavorite = favorites.any { it.id == room.id },
                                onFavoriteClick = { viewModel.toggleFavorite(room) },
                                onClick = { onRoomClick(room.id) }
                            )
                        }
                    }
                }
                
                item { Spacer(modifier = Modifier.height(32.dp)) }
            }
        }
    }
}

@Composable
fun HomeTopBar(query: String, onQueryChange: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(72.dp)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "TrọXịn",
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(end = 16.dp)
        )
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            placeholder = { Text("Tìm quận, địa chỉ...", fontSize = 14.sp) },
            modifier = Modifier.weight(1f).height(48.dp),
            leadingIcon = { Icon(Icons.Default.Search, null, modifier = Modifier.size(18.dp)) },
            shape = RoundedCornerShape(12.dp),
            colors = TextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent
            )
        )
    }
}

@Composable
fun DistrictFilter(selected: String, onSelected: (String) -> Unit) {
    val districts = listOf("Tất cả", "Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Tân Bình")
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(districts) { district ->
            FilterChip(
                selected = selected == district,
                onClick = { onSelected(district) },
                label = { Text(district) },
                shape = RoundedCornerShape(8.dp)
            )
        }
    }
}

@Composable
fun HeroSection() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .padding(16.dp)
            .clip(RoundedCornerShape(16.dp))
    ) {
        AsyncImage(
            model = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                    )
                )
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.Bottom
        ) {
            Text(
                text = "Tìm phòng trọ TP.HCM",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Hơn 500 phòng trống giá tốt",
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        modifier = Modifier.padding(16.dp),
        fontSize = 18.sp,
        fontWeight = FontWeight.ExtraBold
    )
}
