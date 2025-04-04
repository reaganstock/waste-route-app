import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  SafeAreaView,
  ImageBackground,
  Image,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';
const MINIMUM_WATCH_TIME = 10000; // 10 seconds minimum watch time

export default function OnboardingScreen() {
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  
  // Animate entrance
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // We don't need to check or reset here anymore since the _layout handles it
      // Just let the screen render
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const markOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  };

  const handleSkip = async () => {
    if (!videoWatched) {
      Alert.alert(
        "Quick Tutorial",
        "The tutorial will only take a moment and will help you make the most of WasteRoute. Would you like to watch it now?",
        [
          { text: "Watch Now", onPress: () => handleWatchVideo() },
          { text: "Skip Anyway", onPress: async () => {
            await markOnboardingComplete();
            router.navigate('/(auth)');
          }}
        ]
      );
      return;
    }
    
    await markOnboardingComplete();
    router.navigate('/(auth)');
  };

  const handleContinue = async () => {
    if (!videoWatched) {
      Alert.alert(
        "Quick Tutorial",
        "Please watch the tutorial video to get started with WasteRoute. It's quick and informative!",
        [{ text: "Watch Now", onPress: () => handleWatchVideo() }]
      );
      return;
    }
    
    // Mark as complete first to prevent redirect loops
    await markOnboardingComplete();
    
    // Use navigate instead of replace to prevent routing issues
    router.navigate('/(auth)');
  };
  
  const handleWatchVideo = () => {
    setIsPlaying(true);
    setWatchStartTime(Date.now());
    videoRef.current?.playAsync();
  };
  
  const handleVideoStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    // Track progress if the video is playing
    if (status.isPlaying) {
      if (!watchStartTime) {
        setWatchStartTime(Date.now());
      }
      
      // Update progress percentage
      if (status.durationMillis) {
        const progress = status.positionMillis / status.durationMillis;
        setWatchProgress(progress);
      }
    }
    
    // Check if user has watched enough
    if (watchStartTime && Date.now() - watchStartTime > MINIMUM_WATCH_TIME) {
      setVideoWatched(true);
    }
    
    // Handle video completion
    if (status.didJustFinish) {
      setVideoWatched(true);
      setIsPlaying(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../assets/icon.png')} 
      style={styles.backgroundImage}
      imageStyle={{ opacity: 0.1 }}
    >
      <LinearGradient 
        colors={['rgba(15, 23, 42, 0.9)', 'rgba(15, 23, 42, 0.95)', '#0F172A']} 
        style={styles.gradientContainer}
      >
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          
          <Animated.View 
            style={[
              styles.header, 
              { 
                opacity: fadeAnim, 
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>WasteRoute</Text>
            
            {videoWatched && (
              <TouchableOpacity 
                style={styles.skipButton} 
                onPress={handleSkip}
              >
                <Text style={styles.skipText}>Skip</Text>
                <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </Animated.View>
          
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })}]
              }
            ]}
          >
            <View style={styles.scrollContainer}>
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={true}
              >
                <View style={styles.videoContainer}>
                  <View style={styles.videoPlaceholder}>
                    <Image 
                      source={require('../../assets/icon.png')} 
                      style={styles.placeholderImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.placeholderText}>
                      Get Started with WasteRoute
                    </Text>
                    <Text style={styles.placeholderSubtext}>
                      Our smart routing technology helps you optimize waste collection
                      operations efficiently and sustainably.
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.videoButton,
                        videoWatched ? styles.videoButtonWatched : null
                      ]}
                      onPress={handleWatchVideo}
                    >
                      <Ionicons 
                        name={videoWatched ? "checkmark-circle" : "play-circle"} 
                        size={34} 
                        color={videoWatched ? "#22C55E" : "#3B82F6"} 
                      />
                      <Text style={styles.videoButtonText}>
                        {videoWatched ? "Tutorial Completed" : "Watch Quick Tutorial"}
                      </Text>
                    </TouchableOpacity>
                    
                    {videoWatched && (
                      <View style={styles.badge}>
                        <MaterialIcons name="verified" size={18} color="#22C55E" />
                        <Text style={styles.badgeText}>Tutorial Completed</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>Key Features</Text>
                  
                  <View style={styles.featureRow}>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <Ionicons name="map-outline" size={24} color="#3B82F6" />
                      </View>
                      <Text style={styles.featureTitle}>Smart Routing</Text>
                      <Text style={styles.featureDescription}>Optimize routes automatically</Text>
                    </View>
                    
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <Ionicons name="people-outline" size={24} color="#3B82F6" />
                      </View>
                      <Text style={styles.featureTitle}>Team Management</Text>
                      <Text style={styles.featureDescription}>Organize your workforce</Text>
                    </View>
                  </View>
                  
                  <View style={styles.featureRow}>
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <Ionicons name="analytics-outline" size={24} color="#3B82F6" />
                      </View>
                      <Text style={styles.featureTitle}>Real-time Analytics</Text>
                      <Text style={styles.featureDescription}>Track performance metrics</Text>
                    </View>
                    
                    <View style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <Ionicons name="notifications-outline" size={24} color="#3B82F6" />
                      </View>
                      <Text style={styles.featureTitle}>Alerts</Text>
                      <Text style={styles.featureDescription}>Stay updated on route status</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.continueButton,
                  videoWatched ? styles.continueButtonActive : styles.continueButtonDisabled
                ]}
                onPress={handleContinue}
              >
                <Text style={styles.continueText}>
                  {videoWatched ? "Continue to App" : "Watch Tutorial to Continue"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
        
        {isPlaying && (
          <View style={styles.videoOverlay}>
            <View style={styles.videoHeader}>
              <Text style={styles.videoTitle}>WasteRoute Tutorial</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  videoRef.current?.pauseAsync();
                  setIsPlaying(false);
                }}
              >
                <Ionicons name="close-circle" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Video
              ref={videoRef}
              style={styles.fullVideo}
              source={{ 
                uri: 'https://i.imgur.com/c9l4OEM.mp4'
              }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              isLooping={false}
              useNativeControls
              onPlaybackStatusUpdate={handleVideoStatusUpdate}
            />
            
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${watchProgress * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </LinearGradient>
    </ImageBackground>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingBottom: 20,
    marginTop: 10,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 5,
  },
  skipText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  videoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  videoPlaceholder: {
    width: '100%',
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeholderSubtext: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  videoButtonWatched: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  videoButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 15,
  },
  badgeText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  featuresContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    marginHorizontal: 5,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  featureDescription: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 30,
    gap: 10,
  },
  continueButtonActive: {
    backgroundColor: '#3B82F6',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  fullVideo: {
    width: width,
    height: height - 100,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: 5,
    backgroundColor: '#3B82F6',
  },
  buttonContainer: {
    paddingVertical: 20,
    width: '100%',
    marginTop: 'auto',
  },
}); 