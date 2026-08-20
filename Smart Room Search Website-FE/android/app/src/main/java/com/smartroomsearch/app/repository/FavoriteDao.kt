package com.smartroomsearch.app.repository

import androidx.room.*
import com.smartroomsearch.app.model.FavoriteRoom
import kotlinx.coroutines.flow.Flow

@Dao
interface FavoriteDao {
    @Query("SELECT * FROM favorites")
    fun getAllFavorites(): Flow<List<FavoriteRoom>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(room: FavoriteRoom)

    @Delete
    suspend fun delete(room: FavoriteRoom)

    @Query("SELECT EXISTS(SELECT * FROM favorites WHERE id = :id)")
    suspend fun isFavorite(id: Int): Boolean
}

@Database(entities = [FavoriteRoom::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun favoriteDao(): FavoriteDao
}
