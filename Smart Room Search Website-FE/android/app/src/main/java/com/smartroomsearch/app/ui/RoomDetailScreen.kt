package com.smartroomsearch.app.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun RoomDetailScreen(roomId: Int, viewModel: MainViewModel, onBack: () -> Unit) {
    val rooms by viewModel.rooms.collectAsState()
    val room = rooms.find { it.id == roomId }
    val context = LocalContext.current

    LaunchedEffect(roomId) {
        viewModel.trackView(roomId)
    }

    if (room == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    Scaffold(
        bottomBar = {
            Surface(shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Button(
                        onClick = {
                            viewModel.trackContact(room.id)
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${room.phone}"))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(Icons.Default.Phone, null)
                        Spacer(Modifier.width(8.dp))
                        Text("Gọi điện")
                    }
                    
                    OutlinedButton(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(room.zaloLink))
                            context.startActivity(intent)
                        },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Default.Email, null) // Zalo icon placeholder
                        Spacer(Modifier.width(8.dp))
                        Text("Chat Zalo")
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Image Carousel
            item {
                Box {
                    LazyRow(
                        modifier = Modifier.fillMaxWidth().height(300.dp),
                        horizontalArrangement = Arrangement.spacedBy(1.dp)
                    ) {
                        items(room.images) { imageUrl ->
                            AsyncImage(
                                model = imageUrl,
                                contentDescription = null,
                                modifier = Modifier.fillParentMaxWidth().height(300.dp),
                                contentScale = ContentScale.Crop
                            )
                        }
                    }
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier.padding(16.dp).background(Color.Black.copy(0.3f), RoundedCornerShape(8.dp))
                    ) {
                        Icon(Icons.Default.ArrowBack, null, tint = Color.White)
                    }
                }
            }
            
            item {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        StatusBadge(room.status)
                        Spacer(Modifier.width(8.dp))
                        RatingBar(room.rating)
                    }
                    
                    Spacer(Modifier.height(12.dp))
                    Text(text = room.title, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                    Text(text = room.address, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    
                    HorizontalDivider(Modifier.padding(vertical = 24.dp))
                    
                    // Stats Row
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        DetailStat("Giá thuê", formatPriceShort(room.price))
                        DetailStat("Diện tích", "${room.area}m²")
                        DetailStat("Sức chứa", "${room.maxPeople} người")
                    }
                    
                    HorizontalDivider(Modifier.padding(vertical = 24.dp))
                    
                    Text(text = "Chi phí hàng tháng", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(16.dp))
                    PriceCard("Tiền điện", room.electricity.toDouble().formatPriceFull() + "/kWh")
                    PriceCard("Tiền nước", room.water.toDouble().formatPriceFull() + "/người")
                    PriceCard("Internet", room.internet.toDouble().formatPriceFull() + "/tháng")
                    PriceCard("Phí dịch vụ", room.serviceFee.toDouble().formatPriceFull() + "/tháng")
                    
                    Spacer(Modifier.height(24.dp))
                    Text(text = "Tiện ích", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(12.dp))
                    FlowRow(Modifier.fillMaxWidth()) {
                        room.amenities.forEach { AmenityBadge(it) }
                    }

                    Spacer(Modifier.height(24.dp))
                    Text(text = "Mô tả chi tiết", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(8.dp))
                    Text(text = room.description ?: "Chưa có mô tả.", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 20.sp)
                    
                    Spacer(Modifier.height(32.dp))
                    Text(text = "Vị trí trên bản đồ", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(16.dp))
                    // Map Placeholder
                    Box(Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Text("Google Maps: ${room.lat}, ${room.lng}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    
                    Spacer(Modifier.height(64.dp))
                }
            }
        }
    }
}

@Composable
fun DetailStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
fun PriceCard(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun RatingBar(rating: Double) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.Star, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp))
        Text(text = rating.toString(), fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 4.dp))
    }
}
