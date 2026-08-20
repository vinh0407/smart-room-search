package com.smartroomsearch.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.JsonParser
import com.smartroomsearch.app.api.RetrofitClient
import com.smartroomsearch.app.model.*
import com.smartroomsearch.app.repository.SmartRoomRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class MainViewModel(private val repository: SmartRoomRepository) : ViewModel() {

    private val _rooms = MutableStateFlow<List<Room>>(emptyList())
    val rooms: StateFlow<List<Room>> = _rooms

    private val _demands = MutableStateFlow<List<RoomDemand>>(emptyList())
    val demands: StateFlow<List<RoomDemand>> = _demands

    private val _tenants = MutableStateFlow<List<Tenant>>(emptyList())
    val tenants: StateFlow<List<Tenant>> = _tenants

    private val _stats = MutableStateFlow<RoomStats?>(null)
    val stats: StateFlow<RoomStats?> = _stats

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _token = MutableStateFlow<String?>(null)
    val token: StateFlow<String?> = _token

    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn

    private val _loginError = MutableStateFlow<String?>(null)
    val loginError: StateFlow<String?> = _loginError

    private val _favorites = repository.getFavorites().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    val favorites: StateFlow<List<FavoriteRoom>> = _favorites

    init {
        loadPublicData()
        RetrofitClient.getToken()?.let { saved ->
            _token.value = saved
            _isLoggedIn.value = true
            loadAdminData()
        }
    }

    fun clearLoginError() {
        _loginError.value = null
    }

    fun loadPublicData() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val roomResponse = repository.getRooms()
                if (roomResponse.isSuccessful) {
                    _rooms.value = roomResponse.body() ?: emptyList()
                }

                val demandResponse = repository.getDemands()
                if (demandResponse.isSuccessful) {
                    _demands.value = demandResponse.body() ?: emptyList()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun login(user: String, pass: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _loginError.value = null
            try {
                val response = repository.login(mapOf("username" to user, "password" to pass))
                if (response.isSuccessful) {
                    _token.value = response.body()?.token
                    _isLoggedIn.value = true
                    RetrofitClient.setToken(response.body()?.token)
                    loadAdminData()
                } else {
                    _loginError.value = errorMessage(response)
                }
            } catch (e: Exception) {
                _loginError.value = "Không kết nối được máy chủ"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun loadAdminData() {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                val tenantResponse = repository.getTenants(currentToken)
                if (tenantResponse.isSuccessful) {
                    _tenants.value = tenantResponse.body() ?: emptyList()
                }
                val statsResponse = repository.getStats(currentToken)
                if (statsResponse.isSuccessful) {
                    val body = statsResponse.body()
                    if (body != null) {
                        _stats.value = RoomStats(
                            total = (body["total"] as? Number)?.toLong() ?: 0,
                            available = (body["available"] as? Number)?.toLong() ?: 0,
                            rented = (body["rented"] as? Number)?.toLong() ?: 0,
                            revenue = (body["revenue"] as? Number)?.toDouble() ?: 0.0
                        )
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun refreshAdmin() {
        loadPublicData()
        loadAdminData()
    }

    fun setRoomStatus(roomId: Int, status: RoomStatus) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                if (repository.updateRoomStatus(currentToken, roomId, status.name).isSuccessful) {
                    _rooms.value = _rooms.value.map {
                        if (it.id == roomId) it.copy(status = status) else it
                    }
                    loadAdminData()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteRoom(roomId: Int) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                if (repository.deleteRoom(currentToken, roomId).isSuccessful) {
                    _rooms.value = _rooms.value.filterNot { it.id == roomId }
                    loadAdminData()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteTenant(tenantId: Int, reason: String) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                if (repository.deleteTenant(currentToken, tenantId, reason).isSuccessful) {
                    _tenants.value = _tenants.value.filterNot { it.id == tenantId }
                    loadPublicData()
                    loadAdminData()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteDemand(demandId: Int) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                if (repository.deleteDemand(currentToken, demandId).isSuccessful) {
                    _demands.value = _demands.value.filterNot { it.id == demandId }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun createRoom(data: Map<String, Any?>, onDone: (Boolean) -> Unit) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                val response = repository.createRoom(currentToken, data)
                onDone(response.isSuccessful)
                if (response.isSuccessful) {
                    loadPublicData()
                    loadAdminData()
                }
            } catch (e: Exception) {
                onDone(false)
            }
        }
    }

    fun logout() {
        _token.value = null
        _isLoggedIn.value = false
        _loginError.value = null
        RetrofitClient.setToken(null)
    }

    fun trackView(roomId: Int) {
        viewModelScope.launch {
            try {
                repository.trackView(roomId)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun trackContact(roomId: Int) {
        viewModelScope.launch {
            try {
                repository.trackContact(roomId)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // Favorites Logic
    fun toggleFavorite(room: Room) {
        viewModelScope.launch {
            val isFav = repository.isFavorite(room.id)
            if (isFav) {
                repository.removeFavorite(FavoriteRoom(room.id, room.title, room.price, room.address, room.images.firstOrNull()))
            } else {
                repository.addFavorite(FavoriteRoom(room.id, room.title, room.price, room.address, room.images.firstOrNull()))
            }
        }
    }

    // AI & Geocoding
    fun generateAiDescription(title: String, address: String, price: Double, area: Double, amenities: List<String>, onResult: (String) -> Unit) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                val body = mapOf(
                    "title" to title,
                    "address" to address,
                    "price" to price,
                    "area" to area,
                    "amenities" to amenities
                )
                val response = repository.generateDescription(currentToken, body)
                if (response.isSuccessful) {
                    onResult(response.body()?.get("description") ?: "")
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun geocode(address: String, onResult: (Double, Double) -> Unit) {
        val currentToken = _token.value ?: return
        viewModelScope.launch {
            try {
                val response = repository.geocode(currentToken, address)
                if (response.isSuccessful) {
                    val data = response.body()
                    val lat = (data?.get("lat") as? Double) ?: 0.0
                    val lng = (data?.get("lng") as? Double) ?: 0.0
                    onResult(lat, lng)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun errorMessage(response: retrofit2.Response<*>): String {
        return try {
            val body = response.errorBody()?.string()
                ?: return "Lỗi kết nối máy chủ"
            val obj = JsonParser.parseString(body).asJsonObject
            obj.get("message")?.asString ?: "Lỗi kết nối máy chủ"
        } catch (e: Exception) {
            "Lỗi kết nối máy chủ"
        }
    }
}