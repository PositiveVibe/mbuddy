import React, { useState } from 'react';
import {Image,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,Dimensions, TouchableOpacity, Input,Picker
} from 'react-native'
import * as tf from '@tensorflow/tfjs'
import { cameraWithTensors } from '@tensorflow/tfjs-react-native'
import Constants from 'expo-constants'
import * as posenet from '@tensorflow-models/posenet'
import * as Permissions from 'expo-permissions'
import { Camera } from 'expo-camera';
//import MobileNet from '../mobilenet/Mobilenet'
import 'react-native-console-time-polyfill';
import { Audio } from 'expo-av';
//import RNPickerSelect from 'react-native-picker-select';
//import PureChart from 'react-native-pure-chart';

const IMAGE_SIZE = 224

const MIN_PROBABILITY = 0.5;
const PREDICTION_INTERVAL = 2;

const TensorCamera = cameraWithTensors(Camera);
//sound stuff
const soundSource = {
  uri: './assets/sounds/water.mp3',
};
let sixSecondsData= [];
let sixSecondsTimings = [];
let mHistory = [];
let soundHistory = [];
let canPlaySound = true;
let soundTiming = Date.now();
let letsBegin = false;
let meditationStartTime = Date.now();
let areWeGivingFeedback = true;
let nameToSave = 'test';
let finished = false;
//let givenName = false;

//end sound stuff 
const getMoviesFromApiAsync = async (data) => {
  //console.log(data);
  try {
    let response = await fetch(
      'http://ec2-34-222-220-186.us-west-2.compute.amazonaws.com:5000/', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sixSeconds: data,
      })
    }).then((response) => response.json())
    .then((json) => {if (json==1){console.log('not meditating');mHistory.push([1,Date.now()-meditationStartTime]);}//sixSecondsTimings.push([1,Date.now()-meditationStartTime]);}
                    else{
                    console.log('meditating');

                    mHistory.push([0,Date.now()-meditationStartTime])}
                    console.log('m history: ');
                    console.log(mHistory);
                    if (mHistory.length > 4){
                      if ((mHistory[mHistory.length-1][0]==1 
                          && mHistory[mHistory.length-2][0]==1
                          && mHistory[mHistory.length-3][0]==1) || (
                          mHistory[mHistory.length-1][0]==1 
                          && mHistory[mHistory.length-2][0]==0
                          && mHistory[mHistory.length-3][0]==1
                          && mHistory[mHistory.length-4][0]==1)
                          || (
                          mHistory[mHistory.length-1][0]==1 
                          && mHistory[mHistory.length-2][0]==0
                          && mHistory[mHistory.length-3][0]==1
                          && mHistory[mHistory.length-4][0]==0)
                          ){//&& canPlaySound){
                          console.log('not meditating long enough to play sound');//Not meditating
                          console.log(soundTiming - Date.now());
                          if ( soundTiming -Date.now() < -21000 && Date.now()-meditationStartTime > 95000 && Date.now() - meditationStartTime < 400000){
                            soundTiming = Date.now();
                            if (areWeGivingFeedback){
                              playSound();
                            }
                            soundHistory.push(Date.now()-meditationStartTime);
                          }
                          

                      } else{
                        console.log('meditating, dont play sound');//Meditating
                      }
                    }
                    //;sixSecondsTimings.push([0,Date.now()-meditationStartTime]);}
                  });
  } catch (error) {
    console.error(error);
  }
}
const sendDataToServer = async () => {
  console.log('trying to save data');
  try {
    let response = await fetch(
      'http://ec2-34-222-220-186.us-west-2.compute.amazonaws.com:5000/save', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name:nameToSave,
        saveMePlz: mHistory,
        feedback:areWeGivingFeedback,
        soundHistory:soundHistory
      })
    }).then((response) => response.json())
    //.then((json) => {if (json==1){console.log('not meditating');mHistory.push([1,Date.now()-meditationStartTime]);}//sixSecondsTimings.push([1,Date.now()-meditationStartTime]);}
     //               else{console.log('meditating');mHistory.push([0,Date.now()-meditationStartTime])}//;sixSecondsTimings.push([0,Date.now()-meditationStartTime]);}
     //             });
  } catch (error) {
    console.error(error);
  }
}
/* Format percent utility function */
function percentFormat(num) {
  return (num * 100).toFixed(0) + '%'
}
async function playSound(){

    try {
    console.log('loading');
    Audio.setAudioModeAsync({playsInSilentModeIOS:true});
  const { sound: soundObject, status } = await Audio.Sound.createAsync(
    require('../assets/sounds/gong.mp3'),
    { shouldPlay: true}
      );
  //soundObject.playAsync();
  console.log('playing')
      // Your sound is playing!
    } catch (error) {
      // An error occurred!
      console.log('audio error')
    }
}
async function playIntroMeditation(){

    try {
    Audio.setAudioModeAsync({playsInSilentModeIOS:true});
  const { sound: soundObject, status } = await Audio.Sound.createAsync(
    require('../assets/sounds/introMeditation135.mp3'),
    { shouldPlay: true}
      );
  //soundObject.playAsync();
  //console.log('playing')
  letsBegin = true;
  meditationStartTime = Date.now();

      // Your sound is playing!
    } catch (error) {
      // An error occurred!
      console.log('audio error')
    }
}
async function playEndMeditation(){
    if (!finished){
      try {

      Audio.setAudioModeAsync({playsInSilentModeIOS:true});
    const { sound: soundObject, status } = await Audio.Sound.createAsync(
      require('../assets/sounds/endMeditation.mp3'),
      { shouldPlay: true}
        );
    //soundObject.playAsync();
    //console.log('playing')
    finished = true;
    sendDataToServer();
   

        // Your sound is playing!
      } catch (error) {
        // An error occurred!
        console.log('audio error')
      }
    }
}
/* Request for camera permission */
async function getPermissionAsync() {
  if (Constants.platform.ios) {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)
    if (status !== 'granted') {
      alert('Need camera permission to identify pictures as you go')
    }
    /*const { soundStatus } = await Permissions.askAsync(Permissions.AUDIO)
    if (soundStatus !== 'granted') {
      alert('Need audio permission to identify pictures as you go')
    }*/
  }

}


export const Dropdown = () => {
  const [selectedValue, setSelectedValue] = useState("java");
  return (
    <View style = {styles.viewWrapper}>
     <View style = {styles.viewWrapper}>
      <Text style={styles.initializingText}>
            Please select your name
          </Text>
          <Text style={styles.initializingText}>
            and choose feedback option.
          </Text>
      </View>    
    <View style = {styles.viewWrapper}>
      <Picker
        selectedValue={selectedValue}
        style={{ height: 50, width: 150 ,marginBottom:50,alignSelf:'center'}}
        onValueChange={(itemValue, itemIndex) => {setSelectedValue(itemValue);
            nameToSave=itemValue; }}
      >
      <Picker.Item label="Test" value="test" />
      <Picker.Item label="Natalie" value="Nat" />
      <Picker.Item label="Weston" value="wes" />
      <Picker.Item label="Milka" value="milka" />
        <Picker.Item label="Zach" value="zach" />
        <Picker.Item label="Cheryl" value="cheryl" />
        <Picker.Item label="Tiffany" value="tiff" />
        <Picker.Item label="Murielle" value="murl" />
        <Picker.Item label="Ashley" value="ashley" />
        
      </Picker>
      </View>
      
    </View>
  );
};
export const FeedbackDropdown = () => {
  const [selectedValue, setSelectedValue] = useState("java");
  return (
    <View style = {styles.viewWrapper}>
         
    <View style = {styles.viewWrapper}>
      <Picker
        selectedValue={selectedValue}
        style={{ height: 50, width: 150 ,marginBottom:50,alignSelf:'center'}}
        onValueChange={(itemValue, itemIndex) => {
            setSelectedValue(itemValue);areWeGivingFeedback=itemValue; 
            console.log(areWeGivingFeedback);
          }}
      >
        <Picker.Item label="Feedback" value={true} />
        <Picker.Item label="No Feedback" value={false} />
      </Picker>
      </View>
      
    </View>
  );
};
export default class CameraScreen extends React.Component {
  state = {
    loadingComplete: false
    , cameraType: Camera.Constants.Type.front
    , predictions: []
    , classes: 0
    , meditationHistory: []
    , isPersonCentered: false
    , givenName: false
    
    
  }

  frame_id = 0;

  constructor() {
    super();
  }

  loadModel = async () => {
    try {
      await tf.ready()
      console.time("Loading model");
      this.model = await posenet.load({outputStride: 16,});//)inputResolution: { width: styles.textureDims.wiith, height: 480 })
      this.setState({ loadingComplete: true });
    } catch (e) {
      console.error(e);
    } finally {
      console.timeEnd("Loading model");
    }
  }

  updateModelWrapper = async (model) => {
    // Call only once
    if (!this.modelwrapper) {
      this.modelwrapper = model;
      await this.loadModel();
    }
  }
  nameHasBeenGiven = () =>{
    const {isPersonCentered, givenName} = this.state;
    this.setState({givenName:true});
    console.log('name has been given');
    console.log(givenName);
  }
  async componentDidMount() {
    try {
      getPermissionAsync();
    } catch (e) {
      console.error(e);
    }
  }

  handleCameraStream = (images, updatePreview, gl) => {
    let last_classify_ts = 0;
    let totalTime = Date.now();

    const loop = async () => {
      this.frame_id++;
      let current_ts = Date.now();
      if (this.frame_id % PREDICTION_INTERVAL == 0) {
        const imageTensor = images.next().value
        if (imageTensor) {
          const start_prediction = Date.now();
          console.time("predict")
          let prediction = await this.model.estimateSinglePose(imageTensor, {
                          flipHorizontal: false
                        });//this.modelwrapper.predict(imageTensor)
          console.timeEnd("predict")
          if (prediction) {
            
            const prediction_time = Date.now() - start_prediction
            
            //console.log('x' + prediction['keypoints'][0]['position']['x']);
            //console.log('y' + prediction['keypoints'][0]['position']['y']);
            if (prediction['keypoints'][0]['position']['x'] > 300 && prediction['keypoints'][0]['position']['x'] < 900 
                && prediction['keypoints'][0]['position']['y'] > 200 && prediction['keypoints'][0]['position']['y'] < 500){
              this.setState({isPersonCentered:true});
            }
            else{
             this.setState({isPersonCentered:false}); 
            }
            tf.dispose([imageTensor]);
            //this.setState({ predictions:prediction })
            last_classify_ts = Date.now();
            //console.log('---------------------------------------------')
            if (letsBegin){
              if (Date.now()-meditationStartTime >95000){//260000 = 4:20
                //console.log('4:20 seconds after it began');
                canPlaySound = true;
              }
              if (Date.now() - meditationStartTime > 420000 && !finished){ //420000=7 mins
                //send data to server
                playEndMeditation();
                finished = true;
              }
              sixSecondsData.push(prediction['keypoints'][0]['position']['x'],prediction['keypoints'][0]['position']['y'],
              prediction['keypoints'][1]['position']['x'],prediction['keypoints'][1]['position']['y'],
              prediction['keypoints'][2]['position']['x'],prediction['keypoints'][2]['position']['y'],
              prediction['keypoints'][3]['position']['x'],prediction['keypoints'][3]['position']['y'],
              prediction['keypoints'][4]['position']['x'],prediction['keypoints'][4]['position']['y'],
              prediction['keypoints'][5]['position']['x'],prediction['keypoints'][5]['position']['y'],
              prediction['keypoints'][6]['position']['x'],prediction['keypoints'][6]['position']['y']);
              
              if (sixSecondsData.length==196){
                console.log('six seconds of data');
                //console.log(sixSecondsData)
                //this.setState({meditationHistory:push(getMoviesFromApiAsync(sixSecondsData))});
                getMoviesFromApiAsync(sixSecondsData);
                //console.log('m history: ');
                //console.log(mHistory);
                //console.log(sixSecondsTimings);
                //checkMeditating();
                /*if (mHistory.length > 4){
                  if ((mHistory[mHistory.length-1][0]==1 
                      && mHistory[mHistory.length-2][0]==1
                      && mHistory[mHistory.length-3][0]==1) || (
                      mHistory[mHistory.length-1][0]==1 
                      && mHistory[mHistory.length-2][0]==0
                      && mHistory[mHistory.length-3][0]==1
                      && mHistory[mHistory.length-4][0]==1)
                      ){//&& canPlaySound){
                      console.log('yes');//Not meditating
                      console.log(soundTiming - Date.now());
                      if ( soundTiming -Date.now() < -24000 && Date.now()-meditationStartTime > 260000 && Date.now() - meditationStartTime < 600000 && areWeGivingFeedback){
                        soundTiming = Date.now();
                        playSound();
                      }
                    

                  } else{
                    console.log('no');//Meditating
                  }
                } */
                sixSecondsData=[];
                
              }
            //console.log(this.frame_id)
            //console.log(this.frame_id/2/(Date.now() - totalTime))
            }
          }
        }
      }
      requestAnimationFrame(loop);
    }
    try {
      loop();
    } catch (error) {
      console.error(error)
    }
  }

  renderPrediction = prediction => {
    return (
      <Text key={prediction.label} style={styles.text}>
        {prediction.label + " " + percentFormat(prediction.value)}
      </Text>
    )
  }

  resetApp = () => {
    const {isPersonCentered, givenName} = this.state;
    this.setState({givenName:false});
    finished = false;
    meditationStartTime = Date.now();
    letsBegin = false;
    mHistory = [];
    soundHistory = [];
    areWeGivingFeedback = true;
    this.setState({ loadingComplete: true });
  }

  renderInitializing = () => {
    console.log('lol');

    this.loadModel();
    return (
      <View style={styles.viewWrapper}>
        <View style={styles.viewWrapper}>
        <Image
            source={{ uri: './assets/images/splash.png'}}
            style={styles.thumbnail}
          />
          <Text style={styles.initializingText}>
            Take a few deep breaths 
          </Text>
          <Text style={styles.initializingText}>
          while we set everything up.
          </Text>
          
          
        </View>
        
      </View>
    )
  }
/*<View style={styles.viewWrapper}>
          <ActivityIndicator  style = 'marginTop:500px' size='large' />
        </View>
    */
  renderTensorCamera = () => {
    
      return (

      <TensorCamera
        style={styles.camera}
        type={this.state.cameraType}
        cameraTextureHeight={styles.textureDims.height}
        cameraTextureWidth={styles.textureDims.width}
        resizeHeight={720}
        resizeWidth={1280}
        resizeDepth={3}
        onReady={this.handleCameraStream}
        autorender={false}
        >
        

      </TensorCamera>

    )

  }
  renderNothing=()=>{
    return(
      <View>
      </View>
      )
  }
  renderButton =() =>{
    return (
        
          <TouchableOpacity
                onPress={playIntroMeditation}
                style={styles.button}>
                  <Text style={styles.buttonText}>Start Meditation</Text>
            </TouchableOpacity>      
      )
  }

  render() {
    const {isPersonCentered, givenName} = this.state;
        if (!this.state.loadingComplete){
          return(
            <View style={styles.viewWrapper}>
            {this.renderInitializing()}
            </View>
            )
        }else{
          if (!givenName && !finished){
            return (
              <View style={styles.viewWrapper}>
                <Dropdown />
                <FeedbackDropdown />
                <View style = {styles.viewWrapper}>
               <TouchableOpacity
                  onPress={this.nameHasBeenGiven}
                  style={styles.button}>
                    <Text style={styles.buttonText}>Options correct</Text>
                  </TouchableOpacity>    
                </View>
                
                
              </View>
              )
          } else if (!finished){
            return(
              <View style={styles.viewWrapper}>
                {this.renderTensorCamera()}

                {letsBegin ? 
                    (<View style={styles.viewWrapperButton}>
                        <Text style={styles.initializingText}>
                              Let's begin :)  
                        </Text>
                        {/*<TouchableOpacity
                  onPress={playEndMeditation}
                  style={styles.button}>
                    <Text style={styles.buttonText}>Send Data</Text>
                  </TouchableOpacity>*/}
                    </View>) 
                  : 

                  (<View style={styles.viewWrapperButton}><Text style={styles.text}>
                 Please align your head and shoulders to the center of the frame.
                </Text>
                <Text style={styles.text}>
                Do we see you centered?
                {isPersonCentered ? <Text>✅</Text> : ''}
                </Text>
                  {this.state.loadingComplete && this.state.isPersonCentered ? this.renderButton(): this.renderNothing()}
                </View>)}
                
              </View>
              )
          } else{
            return(
            <View style={styles.viewWrapperButton}>
                        <Text style={styles.initializingText}>
                             Thank you!
                        </Text>
                        <Text style={styles.initializingText}>
                             Enjoy your day :) 
                        </Text>
                        <TouchableOpacity
                  onPress={this.resetApp}
                  style={styles.button}>
                    <Text style={styles.buttonText}>Start over</Text>
                  </TouchableOpacity>  
            </View>
            )
          }
        }
    /*

    
    return (
      <View style={styles.viewWrapper}>
       
        

        {this.state.loadingComplete  ? this.renderTensorCamera() : this.renderInitializing()}
      {this.state.loadingComplete ? (<View style={styles.viewWrapperButton} >
          <Text style={styles.text}>
             Please align your head and shoulders to the center of the frame.
          </Text>
          <Text style={styles.text}>
          Do we see you centered?
          {isPersonCentered ? <Text>✅</Text> : ''}
          </Text>
            {this.state.loadingComplete && this.state.isPersonCentered ? this.renderButton(): this.renderNothing()}
          <Text style={styles.text}>
          letsBegin?
          {letsBegin ? <Text>✅</Text> : ''}
          </Text>
        </View>) : this.renderNothing()
      }
      
    
      </View>
    )*/
  }
}
/*
 <View style={styles.viewWrapper} >
    <TouchableOpacity
          onPress={playIntroMeditation}
          style={styles.button}>
            <Text style={styles.buttonText}>Start Meditation</Text>
          </TouchableOpacity>      
  </View>


*/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  viewWrapper: {
    flex: 1,
    flexDirection: "column",
    zIndex:2
  },
  viewWrapperButton: {
    flex: .5,
    flexDirection: "column",
    zIndex:2
  },
  camera: {
    flex: 1,
    zIndex:2,
  },
  contentContainer: {
    paddingTop: 15,
  },
  optionIconContainer: {
    marginRight: 12,
  },
  option: {
    backgroundColor: '#fdfdfd',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: '#ededed',
  },
  lastOption: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  initializingText: {
    fontSize: 25,
    fontWeight: '200',
    top: '50%',
    left: '10%',
    alignContent: 'center',
    
    
  },
  predictionWrapper: {
    zIndex:1,
    fontSize: 18,
    color: 'white',
    top: "80%",
    flex:1
  },
  text: {
    color: '#000000',
    textAlign: "center",
    margin: 20,
    fontSize: 18
  },
  textureDims: {
    height: Platform.OS === 'ios' ? 1920 : 1200,
    width: Platform.OS === 'ios' ? 1080 : 1600,
  },
  thumbnail:{
    width:1000,
    height:1000,
    resizeMode:'cover',
    opacity:1,
    top:50,
    left:(Dimensions.get('window').width / 2) - 50,
    position:'absolute',
    alignSelf:'center'
  },
  button: {
    backgroundColor: "blue",
    padding: 30,
    width:200,
    height:90,
    borderRadius: 5,
    alignSelf:'center',
    textAlign:'center'
    /*position:'absolute',
    top:'30%',
    bottom:0,
    right:0,
    left:'30%',
    zIndex:10*/
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
  },
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: "center",
    flexDirection:'column'
  },
});
