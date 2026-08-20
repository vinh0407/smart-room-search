package com.smartroomsearch.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Create
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartroomsearch.app.model.RoomStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminAddRoomScreen(viewModel: MainViewModel, onBack: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var district by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var area by remember { mutableStateOf("") }
    var maxPeople by remember { mutableStateOf("2") }
    var phone by remember { mutableStateOf("") }
    var images by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var status by remember { mutableStateOf(RoomStatus.available) }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var aiLoading by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    fun doCreate() {
        val priceVal = price.toDoubleOrNull()
        val areaVal = area.toDoubleOrNull()
        val maxPeopleVal = maxPeople.toIntOrNull() ?: 2
        if (title.isBlank() || address.isBlank() || priceVal == null) {
            submitError = "Vui lòng nhập tiêu đề, địa chỉ và giá thuê"
            return
        }
        submitError = null
        val imageList = images.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() && it.startsWith("http") }
        val body = mapOf(
            "title" to title.trim(),
            "description" to description.trim(),
            "address" to address.trim(),
            "price" to priceVal,
            "area" to (areaVal ?: 20.0),
            "status" to status.name,
            "images" to imageList,
            "electricity" to 3500,
            "water" to 150000,
            "internet" to 100000,
            "serviceFee" to 200000,
            "maxPeople" to maxPeopleVal,
            "district" to district.trim().ifEmpty { "Quận 1" },
            "city" to "TP.HCM",
            "lat" to 10.7731,
            "lng" to 106.6952,
            "amenities" to emptyList<String>(),
            "phone" to phone.trim(),
            "zaloLink" to "https://zalo.me/${phone.trim()}",
            "views" to 0,
            "contacts" to 0,
            "isFeatured" to false,
            "isNew" to true,
            "isCheap" to false,
            "rating" to 4.5
        )
        isSubmitting = true
        viewModel.createRoom(body) { success ->
            isSubmitting = false
            if (success) {
                onBack()
            } else {
                submitError = "Đăng phòng thất bại, kiểm tra lại thông tin"
            }
        }
    }

    fun doAi() {
        if (title.isBlank() || address.isBlank()) {
            submitError = "Nhập tiêu đề và địa chỉ trước khi tạo mô tả AI"
            return
        }
        aiLoading = true
        viewModel.generateAiDescription(
            title = title.trim(),
            address = address.trim(),
            price = price.toDoubleOrNull() ?: 0.0,
            area = area.toDoubleOrNull() ?: 0.0,
            amenities = emptyList(),
            onResult = { result ->
                aiLoading = false
                if (result.isNotBlank()) {
                    description = result
                } else {
                    submitError = "Chưa tạo được mô tả, thử lại sau"
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Đăng phòng mới", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Tiêu đề") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text("Địa chỉ") },
                modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
                value = district,
                onValueChange = { district = it },
                label = { Text("Quận / Huyện (VD: Quận 1)") },
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Giá thuê (đ)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = area,
                    onValueChange = { area = it },
                    label = { Text("Diện tích (m²)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = maxPeople,
                    onValueChange = { maxPeople = it },
                    label = { Text("Số người tối đa") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("SĐT liên hệ") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.weight(1f)
                )
            }
            OutlinedTextField(
                value = images,
                onValueChange = { images = it },
                label = { Text("Link ảnh (mỗi dòng 1 link)") },
                modifier = Modifier.fillMaxWidth().height(90.dp),
                textStyle = LocalTextStyle.current.copy(fontSize = 13.sp)
            )
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Mô tả") },
                modifier = Modifier.fillMaxWidth().height(140.dp)
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Trạng thái", fontWeight = FontWeight.Bold)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RoomStatus.values().forEach { s ->
                        FilterChip(
                            selected = s == status,
                            onClick = { status = s },
                            label = {
                                Text(
                                    when (s) {
                                        RoomStatus.available -> "Còn trống"
                                        RoomStatus.rented -> "Đã thuê"
                                        RoomStatus.maintenance -> "Bảo trì"
                                    },
                                    fontSize = 12.sp
                                )
                            }
                        )
                    }
                }
            }

            submitError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }

            OutlinedButton(
                onClick = { doAi() },
                enabled = !aiLoading,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (aiLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("Đang tạo mô tả...")
                } else {
                    Icon(Icons.Default.Create, null)
                    Spacer(Modifier.width(8.dp))
                    Text("AI viết mô tả")
                }
            }

            Button(
                onClick = { doCreate() },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Icon(Icons.AutoMirrored.Filled.Send, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Đăng phòng", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}