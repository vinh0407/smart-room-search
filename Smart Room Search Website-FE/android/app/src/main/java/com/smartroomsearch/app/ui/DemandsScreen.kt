package com.smartroomsearch.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartroomsearch.app.model.RoomDemand

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DemandsScreen(viewModel: MainViewModel) {
    val demands by viewModel.demands.collectAsState()
    val isLoggedIn by viewModel.isLoggedIn.collectAsState()
    var demandToDelete by remember { mutableStateOf<RoomDemand?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Nhu cầu tìm phòng", fontWeight = FontWeight.Bold) })
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(demands) { demand ->
                DemandCard(demand, isAdmin = isLoggedIn, onDelete = { demandToDelete = demand })
            }
        }
    }

    demandToDelete?.let { demand ->
        AlertDialog(
            onDismissRequest = { demandToDelete = null },
            title = { Text("Xóa nhu cầu") },
            text = { Text("Xóa nhu cầu của ${demand.fullName}?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteDemand(demand.id)
                        demandToDelete = null
                    }
                ) { Text("Xóa", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { demandToDelete = null }) { Text("Hủy") }
            }
        )
    }
}

@Composable
fun DemandCard(demand: RoomDemand, isAdmin: Boolean = false, onDelete: () -> Unit = {}) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(text = demand.district ?: "Khu vực bất kỳ", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    val priceText = demand.maxPrice?.let { "≤ ${it.formatPriceFull()}" } ?: "Giá bất kỳ"
                    Text(text = priceText, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (isAdmin) {
                        IconButton(onClick = onDelete) {
                            Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(text = demand.fullName, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(text = "${demand.peopleCount} người • ${demand.phone}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            demand.note?.let {
                Spacer(Modifier.height(8.dp))
                Text(text = it, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontStyle = androidx.compose.ui.text.font.FontStyle.Italic)
            }
        }
    }
}
