package com.smartroomsearch.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartroomsearch.app.model.RoomStats

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    viewModel: MainViewModel,
    onAddRoom: () -> Unit,
    onManageRooms: () -> Unit,
    onManageTenants: () -> Unit,
    onManageDemands: () -> Unit
) {
    val stats by viewModel.stats.collectAsState()
    val tenants by viewModel.tenants.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Admin Dashboard", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { viewModel.refreshAdmin() }) {
                        Icon(Icons.Default.Refresh, null)
                    }
                    IconButton(onClick = { viewModel.logout() }) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, null)
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(text = "Thống kê tổng quan", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            }

            item {
                val s: RoomStats = stats ?: RoomStats()
                val statItems = listOf(
                    StatItem("Tổng phòng", s.total.toString(), Icons.Default.Home),
                    StatItem("Còn trống", s.available.toString(), Icons.Default.CheckCircle),
                    StatItem("Đã thuê", s.rented.toString(), Icons.Default.Person),
                    StatItem("Doanh thu", formatPriceShort(s.revenue), Icons.Default.ShoppingCart)
                )
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        StatCard(statItems[0], Modifier.weight(1f))
                        StatCard(statItems[1], Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        StatCard(statItems[2], Modifier.weight(1f))
                        StatCard(statItems[3], Modifier.weight(1f))
                    }
                }
            }

            item {
                Text(text = "Khách thuê hiện tại (${tenants.size})", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            item {
                Text(text = "Quản lý nhanh", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }

            item { QuickActionButton(Icons.Default.Add, "Đăng phòng mới", onAddRoom, Color(0xFF10B981)) }
            item { QuickActionButton(Icons.Default.Home, "Quản lý phòng", onManageRooms, Color(0xFF3B82F6)) }
            item { QuickActionButton(Icons.Default.Person, "Quản lý khách thuê", onManageTenants, Color(0xFFF59E0B)) }
            item { QuickActionButton(Icons.Default.Info, "Nhu cầu tìm phòng", onManageDemands, Color(0xFF8B5CF6)) }
        }
    }
}

data class StatItem(val label: String, val value: String, val icon: ImageVector)

@Composable
fun StatCard(item: StatItem, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Icon(item.icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
            Spacer(Modifier.height(12.dp))
            Text(text = item.label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(text = item.value, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
fun QuickActionButton(icon: ImageVector, label: String, onClick: () -> Unit, color: Color) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(color = color.copy(alpha = 0.12f), shape = RoundedCornerShape(10.dp)) {
                Icon(icon, null, tint = color, modifier = Modifier.padding(10.dp).size(22.dp))
            }
            Spacer(Modifier.width(14.dp))
            Text(label, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}