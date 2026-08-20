package com.smartroomsearch.app.model

import com.google.gson.annotations.SerializedName
import androidx.room.Entity
import androidx.room.PrimaryKey

enum class RoomStatus { available, rented, maintenance }

data class Room(
    val id: Int,
    val title: String,
    val description: String?,
    val address: String,
    val price: Double,
    val area: Double,
    val images: List<String>, 
    val status: RoomStatus,
    val electricity: Int = 3500,
    val water: Int = 150000,
    val internet: Int = 100000,
    @SerializedName("service_fee") val serviceFee: Int = 200000,
    @SerializedName("max_people") val maxPeople: Int = 2,
    val district: String = "Quận 1",
    val city: String = "TP.HCM",
    val lat: Double = 10.7731,
    val lng: Double = 106.6952,
    val amenities: List<String>,
    val phone: String = "0901234567",
    @SerializedName("zalo_link") val zaloLink: String = "https://zalo.me/0901234567",
    val views: Int = 0,
    val contacts: Int = 0,
    @SerializedName("is_featured") val isFeatured: Boolean = false,
    @SerializedName("is_new") val isNew: Boolean = false,
    @SerializedName("is_cheap") val isCheap: Boolean = false,
    val rating: Double = 4.5,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("updated_at") val updatedAt: String?
)

@Entity(tableName = "favorites")
data class FavoriteRoom(
    @PrimaryKey val id: Int,
    val title: String,
    val price: Double,
    val address: String,
    val imageUrl: String?
)

data class Tenant(
    val id: Int,
    @SerializedName("room_id") val roomId: Int,
    @SerializedName("room_title") val roomTitle: String?,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val cccd: String?,
    @SerializedName("deposit_amount") val depositAmount: Double?,
    @SerializedName("amount_given") val amountGiven: Double?,
    @SerializedName("amount_remaining") val amountRemaining: Double?,
    @SerializedName("rent_price") val rentPrice: Double?,
    @SerializedName("contract_signed_date") val contractSignedDate: String?,
    @SerializedName("move_in_date") val moveInDate: String?,
    @SerializedName("start_date") val startDate: String?,
    @SerializedName("end_date") val endDate: String?,
    @SerializedName("people_count") val peopleCount: Int = 1,
    @SerializedName("contract_months") val contractMonths: Int = 0,
    @SerializedName("owner_name") val ownerName: String?,
    @SerializedName("owner_phone") val ownerPhone: String?,
    @SerializedName("payment_status") val paymentStatus: String?,
    val note: String?,
    @SerializedName("is_complete") val isComplete: Boolean = false,
    @SerializedName("created_at") val createdAt: String?
)

data class TenantHistory(
    val id: Int,
    @SerializedName("tenant_id") val tenantId: Int,
    @SerializedName("room_id") val roomId: Int,
    @SerializedName("room_title") val roomTitle: String,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val cccd: String?,
    @SerializedName("deposit_amount") val depositAmount: Double?,
    @SerializedName("rent_price") val rentPrice: Double?,
    @SerializedName("move_in_date") val moveInDate: String?,
    @SerializedName("start_date") val startDate: String?,
    @SerializedName("end_date") val endDate: String?,
    @SerializedName("delete_reason") val deleteReason: String?,
    @SerializedName("deleted_at") val deletedAt: String?
)

data class RoomDemand(
    val id: Int,
    @SerializedName("full_name") val fullName: String,
    val phone: String,
    val gender: String?,
    val district: String?,
    @SerializedName("max_price") val maxPrice: Double?,
    @SerializedName("people_count") val peopleCount: Int = 1,
    val note: String?,
    @SerializedName("created_at") val createdAt: String?
)

data class LoginResponse(
    val token: String,
    val user: UserInfo
)

data class UserInfo(
    val id: Int,
    val username: String,
    val role: String
)
