package com.smartroomsearch.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.smartroomsearch.app.ui.*

class MainActivity : ComponentActivity() {
    
    private val viewModel: MainViewModel by viewModels {
        object : ViewModelProvider.Factory {
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                val repository = (application as SmartRoomApplication).repository
                return MainViewModel(repository) as T
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        setContent {
            SmartRoomTheme {
                AppMain(viewModel)
            }
        }
    }
}

@Composable
fun AppMain(viewModel: MainViewModel) {
    val navController = rememberNavController()
    val items = listOf(
        Screen.Home,
        Screen.Rooms,
        Screen.Demands,
        Screen.Admin
    )

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { screen ->
                    NavigationBarItem(
                        icon = { Icon(screen.icon, contentDescription = null) },
                        label = { Text(screen.title) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeScreen(viewModel) { roomId ->
                    navController.navigate("detail/$roomId")
                }
            }
            composable(Screen.Rooms.route) {
                RoomsScreen(viewModel) { roomId ->
                    navController.navigate("detail/$roomId")
                }
            }
            composable(Screen.Demands.route) {
                DemandsScreen(viewModel)
            }
            composable(Screen.Admin.route) {
                val isLoggedIn by viewModel.isLoggedIn.collectAsState()
                if (isLoggedIn) {
                    AdminDashboardScreen(
                        viewModel,
                        onAddRoom = { navController.navigate("admin_add_room") },
                        onManageRooms = { navController.navigate("admin_rooms") },
                        onManageTenants = { navController.navigate("admin_tenants") },
                        onManageDemands = { navController.navigate(Screen.Demands.route) }
                    )
                } else {
                    AdminLoginScreen(viewModel)
                }
            }
            composable("admin_add_room") {
                AdminAddRoomScreen(viewModel, onBack = { navController.popBackStack() })
            }
            composable("admin_rooms") {
                AdminRoomsScreen(viewModel, onBack = { navController.popBackStack() })
            }
            composable("admin_tenants") {
                AdminTenantsScreen(viewModel, onBack = { navController.popBackStack() })
            }
            composable(
                "detail/{roomId}",
                arguments = listOf(navArgument("roomId") { type = NavType.IntType })
            ) { backStackEntry ->
                val roomId = backStackEntry.arguments?.getInt("roomId") ?: return@composable
                RoomDetailScreen(roomId, viewModel) {
                    navController.popBackStack()
                }
            }
        }
    }
}

sealed class Screen(val route: String, val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    object Home : Screen("home", "Trang chủ", Icons.Default.Home)
    object Rooms : Screen("rooms", "Phòng", Icons.Default.Search)
    object Demands : Screen("demands", "Nhu cầu", Icons.Default.List)
    object Admin : Screen("admin", "Admin", Icons.Default.Person)
}
