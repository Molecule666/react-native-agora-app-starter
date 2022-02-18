import React, { useEffect, useRef, useState } from 'react';

import {
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  Dimensions,
  Share,
  TouchableOpacity,
} from 'react-native';

import RtcEngine, {
  ChannelProfile,
  ClientRole,
  RtcLocalView,
  RtcRemoteView,
  VideoRemoteState,
} from 'react-native-agora';

const dimensions = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
};

export default function Live(props) {
  const isBroadcaster = props.route.params.type === 'create';
  const AgoraEngine = useRef();

  const [joined, setJoined] = useState(false);
  const [broadcasterVideoState, setBroadcasterVideoState] = useState(
    VideoRemoteState.Decoding,
  );

  const init = async () => {
    AgoraEngine.current = await RtcEngine.create('your app id');
    console.log(
      'ChannelProfile.LiveBroadcasting => ',
      ChannelProfile.LiveBroadcasting,
    );
    AgoraEngine.current.enableVideo();
    AgoraEngine.current.setChannelProfile(ChannelProfile.LiveBroadcasting);

    console.log('isBroadcaster => ', isBroadcaster);
    if (isBroadcaster) {
      AgoraEngine.current.setClientRole(ClientRole.Broadcaster);
    }

    console.log('set JoinChannelSuccess listener');
    AgoraEngine.current.addListener(
      'JoinChannelSuccess',
      (channel, uid, elapsed) => {
        console.log('JoinChannelSuccess', channel, uid, elapsed);
        setJoined(true);
      },
    );

    console.log('set RemoteVideoStateChanged listener');

    AgoraEngine.current.addListener('RemoteVideoStateChanged', (uid, state) => {
      if (uid === 1) {
        setBroadcasterVideoState(state);
      }
    });
  };

  useEffect(() => {
    if (Platform.OS === 'android') requestCameraAndAudioPermission();
    const uid = isBroadcaster ? 1 : 0;
    init().then(() =>
      AgoraEngine.current.joinChannel(
        null,
        props.route.params.channel,
        null,
        uid,
      ),
    );
    return () => {
      AgoraEngine.current.destroy();
    };
  }, []);

  const videoStateMessage = (state) => {
    switch (state) {
      case VideoRemoteState.Stopped:
        return 'Video turned off by Host';

      case VideoRemoteState.Frozen:
        return 'Connection Issue, Please Wait';

      case VideoRemoteState.Failed:
        return 'Network Error';
    }
  };

  async function requestCameraAndAudioPermission() {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      if (
        granted['android.permission.RECORD_AUDIO'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.CAMERA'] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log('You can use the cameras & mic');
      } else {
        console.log('Permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  }

  const onSwitchCamera = () => AgoraEngine.current.switchCamera();

  const onShare = async () => {
    try {
      await Share.share({ message: props.route.params.channel });
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <View style={styles.container}>
      {!joined ? (
        <>
          <ActivityIndicator
            size={60}
            color="#222"
            style={styles.activityIndicator}
          />
          <Text style={styles.loadingText}>Joining Stream, Please Wait</Text>
        </>
      ) : (
        // {/ *Live Feed */}
        <>
          {isBroadcaster ? (
            <RtcLocalView.SurfaceView
              style={styles.fullscreen}
              channelId={props.route.params.channel}
            />
          ) : // <RtcRemoteView.SurfaceView
          //   uid={1}
          //   style={styles.fullscreen}
          //   channelId={props.route.params.channel}
          // />
          broadcasterVideoState === VideoRemoteState.Decoding ? (
            <RtcRemoteView.SurfaceView
              uid={1}
              style={styles.fullscreen}
              channelId={props.route.params.channel}
            />
          ) : (
            <View style={styles.broadcasterVideoStateMessage}>
              <Text style={styles.broadcasterVideoStateMessageText}>
                {videoStateMessage(broadcasterVideoState)}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onShare}>
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={onSwitchCamera}>
              <Text style={styles.buttonText}>Switch Camera</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#222',
  },
  fullscreen: {
    width: dimensions.width,
    height: dimensions.height,
  },
  buttonContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
  },
  button: {
    width: 150,
    backgroundColor: '#fff',
    marginBottom: 50,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  buttonText: {
    fontSize: 17,
  },
  broadcasterVideoStateMessage: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  broadcasterVideoStateMessageText: {
    color: '#fff',
    fontSize: 20,
  },
});
