// ===================================
// TEST FILE — Intentional mobile app bugs & issues
// Simulates a React Native screen for testing the reviewer agent.
// Delete this file after verification.
// ===================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  AsyncStorage, // deprecated — should use @react-native-async-storage
  Alert,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import crypto from 'crypto'; // unused import

// ❌ Hardcoded API key in client-side code
const API_KEY = "AIzaSyB-abc123_secretFirebaseKey";
const BASE_URL = "http://api.example.com"; // HTTP, not HTTPS

// TODO: implement proper authentication
export default function UserProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ❌ Missing cleanup — timer leaks on unmount
    const interval = setInterval(() => {
      fetchUserData();
    }, 5000);

    // Subscribing to event but never unsubscribing
    const subscription = navigation.addListener('focus', () => {
      fetchUserData();
    });

    fetchUserData();
    // ❌ No cleanup function returned
  }, []);

  // ❌ Missing await and no error handling
  async function fetchUserData() {
    const response = axios.get(`${BASE_URL}/user/profile`, {
      headers: { 'X-API-Key': API_KEY }
    }); // missing await!
    console.log("DEBUG fetched user:", response.data);
    setUser(response.data);
  }

  // ❌ Storing auth token in AsyncStorage (insecure)
  async function saveToken(token) {
    await AsyncStorage.setItem('auth_token', token);
  }

  // FIXME: this doesn't work on Android
  function handleDeepLink(url) {
    // ❌ No URL validation — navigates to anything
    const path = url.replace('myapp://', '');
    navigation.navigate(path);
  }

  // Placeholder function
  function validateInput(data) {
    // CHANGE_ME: add validation
    return true;
  }

  return (
    // ❌ No SafeAreaView — content will overlap notch/status bar
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* ❌ No loading or error states shown */}

      {/* ❌ Using ScrollView + map for a potentially long list — should use FlatList */}
      <ScrollView>
        {/* ❌ Touch target too small (20x20) */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ width: 20, height: 20, padding: 2 }}
        >
          <Text style={{ fontSize: 10 }}>←</Text>
        </TouchableOpacity>

        {/* ❌ Hardcoded text — not localized */}
        <Text style={{ fontSize: 24, color: '#333', fontWeight: 'bold' }}>
          User Profile
        </Text>

        {/* ❌ Image without dimensions — causes layout thrash */}
        <Image source={{ uri: user?.avatar }} />

        {/* ❌ Hardcoded colors instead of theme */}
        <Text style={{ color: '#7B2FF2', fontSize: 16 }}>
          {user?.name}
        </Text>

        <TextInput
          placeholder="Search posts..."
          // ❌ No keyboard dismiss handling
          // ❌ Inline style object re-creates every render
          style={{
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 8,
            padding: 12,
            margin: 16,
          }}
        />

        {/* ❌ ScrollView + .map() for a long list */}
        {posts.map((post) => (
          // ❌ Missing key prop
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
            <Text>{post.title}</Text>
            <Text style={{ color: '#999' }}>{post.body}</Text>

            {/* ❌ Anonymous function in onPress — causes re-renders */}
            <TouchableOpacity onPress={() => navigation.navigate('PostDetail', { id: post.id })}>
              <Text style={{ color: 'blue' }}>Read more</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ❌ No empty state when posts.length === 0 */}
      </ScrollView>
    </View>
  );
}

// ❌ eval usage — code injection risk
function executeRemoteConfig(configCode) {
  return eval(configCode);
}
