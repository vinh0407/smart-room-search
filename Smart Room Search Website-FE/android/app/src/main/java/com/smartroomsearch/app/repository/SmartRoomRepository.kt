package com.smartroomsearch.app.repository

import com.smartroomsearch.app.api.SmartRoomApiService
import com.smartroomsearch.app.model.*
import kotlinx.coroutines.flow.Flow

class SmartRoomRepository(
    private val api: SmartRoomApiService,
    private val favoriteDao: FavoriteDao
) {
    // Rooms
    suspend fun getRooms(
        status: String? = null,
        district: String? = null,
        priceMin: Double? = null,
        priceMax: Double? = null,
        search: String? = null
    ) = api.listRooms(status, district, priceMin, priceMax, search = search)

    suspend fun getRoom(id: Int) = api.getRoom(id)
    suspend fun trackView(id: Int) = api.incrementView(id)
    suspend fun trackContact(id: Int) = api.incrementContact(id)

    // Admin Rooms
    suspend fun getStats(token: String) = api.getRoomStats("Bearer $token")
    suspend fun createRoom(token: String, room: Room) = api.createRoom("Bearer $token", room)
    suspend fun createRoom(token: String, room: Map<String, Any?>) = api.createRoomMap("Bearer $token", room)
    suspend fun updateRoomStatus(token: String, id: Int, status: String) =
        api.updateRoomStatus("Bearer $token", id, mapOf("status" to status))
    suspend fun deleteRoom(token: String, id: Int) = api.deleteRoom("Bearer $token", id)

    // Tenants
    suspend fun getTenants(token: String) = api.listTenants("Bearer $token")
    suspend fun deleteTenant(token: String, id: Int, reason: String? = null) =
        api.deleteTenant("Bearer $token", id, reason)

    // Demands
    suspend fun getDemands() = api.listDemands()
    suspend fun createDemand(demand: RoomDemand) = api.createDemand(demand)
    suspend fun deleteDemand(token: String, id: Int) = api.deleteDemand("Bearer $token", id)

    // AI & Geocode
    suspend fun geocode(token: String, address: String) = api.geocodeAddress("Bearer $token", address)
    suspend fun generateDescription(token: String, body: Map<String, Any>) = 
        api.generateRoomDescription("Bearer $token", body)

    // Auth
    suspend fun login(credentials: Map<String, String>) = api.login(credentials)

    // Favorites (Offline)
    fun getFavorites(): Flow<List<FavoriteRoom>> = favoriteDao.getAllFavorites()
    suspend fun addFavorite(room: FavoriteRoom) = favoriteDao.insert(room)
    suspend fun removeFavorite(room: FavoriteRoom) = favoriteDao.delete(room)
    suspend fun isFavorite(id: Int) = favoriteDao.isFavorite(id)
}
