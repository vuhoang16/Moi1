import React, { useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth.store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { theme } from '../theme';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';

// Landlord screens
import LandlordHomeScreen from '../screens/landlord/HomeScreen';
import PropertiesScreen from '../screens/landlord/PropertiesScreen';
import PropertyDetailScreen from '../screens/landlord/PropertyDetailScreen';
import RoomDetailScreen from '../screens/landlord/RoomDetailScreen';
import ContractListScreen from '../screens/landlord/ContractListScreen';
import MaintenanceListScreen from '../screens/landlord/MaintenanceListScreen';
import ReportsScreen from '../screens/landlord/ReportsScreen';
import CreatePropertyScreen from '../screens/landlord/CreatePropertyScreen';
import CreateRoomScreen from '../screens/landlord/CreateRoomScreen';
import CreateContractScreen from '../screens/landlord/CreateContract';
import CreateChecklistScreen from '../screens/landlord/CreateChecklistScreen';
import CreateInvoiceScreen from '../screens/landlord/CreateInvoiceScreen';
import DepositDetailScreen from '../screens/landlord/DepositDetailScreen';

// Tenant screens
import TenantHomeScreen from '../screens/tenant/HomeScreen';
import MaintenanceScreen from '../screens/tenant/MaintenanceScreen';
import SubmitMaintenanceScreen from '../screens/tenant/SubmitMaintenanceScreen';

// Shared screens
import InvoiceListScreen from '../screens/shared/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/shared/InvoiceDetailScreen';
import ContractDetailScreen from '../screens/shared/ContractDetailScreen';
import ChecklistScreen from '../screens/shared/ChecklistScreen';
import MaintenanceDetailScreen from '../screens/shared/MaintenanceDetailScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import PDFViewerScreen from '../screens/shared/PDFViewerScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

export type RootStackParamList = {
  Auth: undefined;
  LandlordApp: undefined;
  TenantApp: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RoleSelection: undefined;
};

export type LandlordTabParamList = {
  Home: undefined;
  Properties: undefined;
  Contracts: undefined;
  Reports: undefined;
  Chat: undefined;
};

export type TenantTabParamList = {
  Home: undefined;
  Invoices: undefined;
  Maintenance: undefined;
  Chat: undefined;
};

export type LandlordStackParamList = {
  LandlordTabs: undefined;
  PropertyDetail: { id: string };
  RoomDetail: { id: string; propertyId: string };
  CreateProperty: undefined;
  CreateRoom: { propertyId: string };
  ContractDetail: { contractId: string };
  CreateContract: undefined;
  CreateInvoice: { contractId: string };
  DepositDetail: { contractId: string };
  InvoiceDetail: { invoiceId: string };
  InvoiceList: { contractId?: string; roomId?: string };
  MaintenanceDetail: { id: string };
  ChecklistScreen: { id: string };
  CreateChecklist: { contractId: string; phase: 'ban_giao' | 'tra_phong' };
  ChatScreen: { conversationId: string };
  Notifications: undefined;
  PDFViewer: { url: string };
  Profile: undefined;
};

export type TenantStackParamList = {
  TenantTabs: undefined;
  InvoiceDetail: { id: string };
  ContractDetail: { id: string };
  MaintenanceDetail: { id: string };
  SubmitMaintenance: undefined;
  ChatScreen: { conversationId: string };
  Notifications: undefined;
  PDFViewer: { url: string };
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const LandlordTab = createBottomTabNavigator<LandlordTabParamList>();
const TenantTab = createBottomTabNavigator<TenantTabParamList>();
const LandlordStack = createNativeStackNavigator<LandlordStackParamList>();
const TenantStack = createNativeStackNavigator<TenantStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    </AuthStack.Navigator>
  );
}

const LANDLORD_TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Properties: 'office-building',
  Contracts: 'file-document-outline',
  Reports: 'chart-bar',
  Chat: 'chat-outline',
};

function LandlordTabNavigator() {
  return (
    <LandlordTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: { paddingBottom: 4 },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={LANDLORD_TAB_ICONS[route.name] as any}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <LandlordTab.Screen name="Home" component={LandlordHomeScreen} options={{ title: 'Trang Chủ' }} />
      <LandlordTab.Screen name="Properties" component={PropertiesScreen} options={{ title: 'Phòng' }} />
      <LandlordTab.Screen name="Contracts" component={ContractListScreen} options={{ title: 'Hợp Đồng' }} />
      <LandlordTab.Screen name="Reports" component={ReportsScreen} options={{ title: 'Báo Cáo' }} />
      <LandlordTab.Screen name="Chat" component={ChatListScreen} options={{ title: 'Tin Nhắn' }} />
    </LandlordTab.Navigator>
  );
}

function TenantTabNavigator() {
  return (
    <TenantTab.Navigator screenOptions={{ headerShown: false }}>
      <TenantTab.Screen name="Home" component={TenantHomeScreen} options={{ title: 'Trang chủ' }} />
      <TenantTab.Screen name="Invoices" component={InvoiceListScreen} options={{ title: 'Hóa đơn' }} />
      <TenantTab.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Bảo trì' }} />
      <TenantTab.Screen name="Chat" component={ChatListScreen} options={{ title: 'Tin nhắn' }} />
    </TenantTab.Navigator>
  );
}

function LandlordNavigator() {
  return (
    <LandlordStack.Navigator>
      <LandlordStack.Screen
        name="LandlordTabs"
        component={LandlordTabNavigator}
        options={{ headerShown: false }}
      />
      <LandlordStack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Chi tiết bất động sản' }} />
      <LandlordStack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: 'Chi tiết phòng' }} />
      <LandlordStack.Screen name="CreateProperty" component={CreatePropertyScreen} options={{ title: 'Thêm bất động sản' }} />
      <LandlordStack.Screen name="CreateRoom" component={CreateRoomScreen} options={{ title: 'Thêm phòng' }} />
      <LandlordStack.Screen name="ContractDetail" component={ContractDetailScreen} options={{ title: 'Hợp đồng' }} />
      <LandlordStack.Screen name="CreateContract" component={CreateContractScreen} options={{ title: 'Tạo hợp đồng', headerShown: false }} />
      <LandlordStack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ title: 'Tạo hóa đơn' }} />
      <LandlordStack.Screen name="DepositDetail" component={DepositDetailScreen} options={{ title: 'Chi tiết tiền cọc' }} />
      <LandlordStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Hóa đơn' }} />
      <LandlordStack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ title: 'Danh sách hóa đơn' }} />
      <LandlordStack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} options={{ title: 'Yêu cầu bảo trì' }} />
      <LandlordStack.Screen name="ChecklistScreen" component={ChecklistScreen} options={{ title: 'Bàn giao / Trả phòng' }} />
      <LandlordStack.Screen name="CreateChecklist" component={CreateChecklistScreen} options={{ title: 'Tạo checklist' }} />
      <LandlordStack.Screen name="ChatScreen" component={ChatScreen} options={{ title: 'Tin nhắn' }} />
      <LandlordStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      <LandlordStack.Screen name="PDFViewer" component={PDFViewerScreen} options={{ title: 'Xem tài liệu' }} />
      <LandlordStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    </LandlordStack.Navigator>
  );
}

function TenantNavigator() {
  return (
    <TenantStack.Navigator>
      <TenantStack.Screen name="TenantTabs" component={TenantTabNavigator} options={{ headerShown: false }} />
      <TenantStack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Hóa đơn' }} />
      <TenantStack.Screen name="ContractDetail" component={ContractDetailScreen} options={{ title: 'Hợp đồng' }} />
      <TenantStack.Screen name="MaintenanceDetail" component={MaintenanceDetailScreen} options={{ title: 'Yêu cầu bảo trì' }} />
      <TenantStack.Screen name="SubmitMaintenance" component={SubmitMaintenanceScreen} options={{ title: 'Gửi yêu cầu bảo trì' }} />
      <TenantStack.Screen name="ChatScreen" component={ChatScreen} options={{ title: 'Tin nhắn' }} />
      <TenantStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Thông báo' }} />
      <TenantStack.Screen name="PDFViewer" component={PDFViewerScreen} options={{ title: 'Xem tài liệu' }} />
      <TenantStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Hồ sơ' }} />
    </TenantStack.Navigator>
  );
}

function AppWithPush() {
  const { user } = useAuthStore();
  const navRef = useRef<NavigationContainerRef<any>>(null);
  const navReady = useRef(false);

  const navigate = (screen: string, params?: any) => {
    if (navReady.current) navRef.current?.navigate(screen as any, params);
  };

  const { foreground, clearForeground } = usePushNotifications(navigate);

  return (
    <>
      <NavigationContainer
        ref={navRef}
        onReady={() => { navReady.current = true; }}
      >
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          ) : user.role === 'chu_nha' ? (
            <RootStack.Screen name="LandlordApp" component={LandlordNavigator} />
          ) : (
            <RootStack.Screen name="TenantApp" component={TenantNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>

      <Snackbar
        visible={!!foreground}
        onDismiss={clearForeground}
        duration={4000}
        action={
          foreground?.data
            ? {
                label: 'Xem',
                onPress: () => {
                  clearForeground();
                  handleTapFromSnackbar(foreground.data!, navigate);
                },
              }
            : undefined
        }
      >
        {foreground ? `${foreground.title}: ${foreground.body}` : ''}
      </Snackbar>
    </>
  );
}

function handleTapFromSnackbar(data: Record<string, string>, navigate: (s: string, p?: any) => void) {
  const { type, relatedEntityId } = data;
  switch (type) {
    case 'invoice_created':
    case 'invoice_overdue':
      navigate('InvoiceDetail', { id: relatedEntityId });
      break;
    case 'new_message':
      navigate('ChatScreen', { conversationId: relatedEntityId });
      break;
    case 'maintenance_update':
      navigate('MaintenanceDetail', { id: relatedEntityId });
      break;
    case 'contract_expiry_warning':
      navigate('ContractDetail', { id: relatedEntityId });
      break;
    default:
      navigate('Notifications');
  }
}

export default AppWithPush;
