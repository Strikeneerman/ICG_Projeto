import * as THREE from 'three';

import {FBXLoader} from 'three/addons/loaders/FBXLoader.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

class CharacterControllerProxy {
  constructor(animations) {
    this.animationsA = animations;
  }

  get animations() {
    return this.animationsA;
  }
};


// Character Controller

class CharacterController{
  constructor(params){
    this.Init(params);
    
  }

  Init(params){
    this.params = params;
    this.velocity = new THREE.Vector3(0,0,0);
    this.acceleration = new THREE.Vector3(1,0.25,50.0);
    this.decceleration = new THREE.Vector3(-0.0005,-0.001,-5.0);

    this.animations = {}
    this.input = new CharacterControllerInput();
    this.stateMachine = new CharacterSM(new CharacterControllerProxy(this.animations));
    this.LoadModels();
  }

  //Load Models

  LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/Player/');
    loader.load('PlayerModel.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      this.target = fbx;
      this.params.scene.add(this.target);

      this.mixer = new THREE.AnimationMixer(this.target);

      this.manager = new THREE.LoadingManager();

      this.manager.onLoad = () => {
        this.stateMachine.SetState('idle')
      }

      const OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this.mixer.clipAction(clip);

        this.animations[animName] = {
          clip: clip,
          action: action,
        }
      }


      const loader = new FBXLoader(this.manager);
      loader.setPath('./resources/models/Player/animations/');
      loader.load('PlayerIdle.fbx', (a) => {OnLoad('idle', a); });
      loader.load('Walking.fbx', (a) => {OnLoad('walk', a); });
     // loader.load('Running.fbx', (a) => {OnLoad('run', a); });
      loader.load('FiringRifle.fbx', (a) => {OnLoad('shoot', a); });
      loader.load('FiringRifleWalk.fbx', (a) => {OnLoad('shootAndWalk', a); });
     // loader.load('FiringRifleRun.fbx', (a) => {OnLoad('shootAndRun', a); });

    });
  };
  Update(timeInSeconds){


    if (!this.target) {
      return;
    }

    this.stateMachine.Update(timeInSeconds, this.input);

    const velocity = this.velocity;
    const frameDecceleration = new THREE.Vector3(
        velocity.x * this.decceleration.x,
        velocity.y * this.decceleration.y,
        velocity.z * this.decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this.target;
    const Q = new THREE.Quaternion();
    const A = new THREE.Vector3();
    const R = controlObject.quaternion.clone();

    const acc = this.acceleration.clone();

    if (this.input.keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this.input.keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this.input.keys.left) {
      A.set(0, 1, 0);
      Q.setFromAxisAngle(A, 4.0 * Math.PI * timeInSeconds * this.acceleration.y);
      R.multiply(Q);
    }
    if (this.input.keys.right) {
      A.set(0, 1, 0);
      Q.setFromAxisAngle(A, 4.0 * -Math.PI * timeInSeconds * this.acceleration.y);
      R.multiply(Q);
    }

    controlObject.quaternion.copy(R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    oldPosition.copy(controlObject.position);

    if (this.mixer) {
      this.mixer.update(timeInSeconds);
    }
  };

}

// Character Controller Input

class CharacterControllerInput{
  constructor(){
    this.Init();
  }

  Init() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      //shift: false,
    };

    document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
  }

    onKeyDown(event){
      switch (event.keyCode) {
          case 68: //d
              this.keys.right = true;
              break;
          case 83: //s
              this.keys.backward = true;
              break;
          case 65: //a
              this.keys.left = true;
              break;
          case 87: //w
              this.keys.forward = true;
              break;
          // case 69: //e
          //     this.keys.right = true;
          //     break;
          // case 81: //q
          //     this.keys.right = true;
              break;
          case 32: //space
              this.keys.space = true;
              break;
          // case 16: //shift
          //     this.keys.shift = true;
          //     break;
        }
    }

    onKeyUp(event) {
      switch (event.keyCode) {
          case 68: //d
              this.keys.right = false;
              break;
          case 83: //s
              this.keys.backward = false;
              break;
          case 65: //a
              this.keys.left = false;
              break;
          case 87: //w
              this.keys.forward = false;
              break;
          // case 69: //e
          //     this.keys.right = true;
          //     break;
          // case 81: //q
          //     this.keys.right = true;
              break;
          case 32: //space
              this.keys.space = false;
              break;
          // case 16: //shift
          //     this.keys.shift = true;
          //     break;
          
      }
    }
  
};



//Finite State machine

class StateMachine{

  constructor(){
    this.states = {};
    this.currentState = null;
  }

  AddState(name, type) {
    this.states[name] = type;
  }

  SetState(name) {
    const prevState = this.currentState;
    
    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this.states[name](this);

    this.currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this.currentState) {
      this.currentState.Update(timeElapsed, input);
    }
  }
};


class CharacterSM extends StateMachine{

  constructor(proxy) {
    super();
    this.proxy = proxy;
    this.Init();
  }

  Init() {
    this.AddState('idle', IdleState);
    this.AddState('walk', WalkState);
    this.AddState('shoot', ShootState);
    this.AddState('shootAndWalk', ShootAndWalkState);
    //this.AddState('run', RunState);
    //this.AddState('shootAndRun', ShootAndRunState);
  }
};


class State {
  constructor(parent) {
    this.parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
};

class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(prevState) {
    const idleAction = this.parent.proxy.animations['idle'].action;
    if (prevState) {
      const prevAction = this.parent.proxy.animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if(input.keys.forward || input.keys.backward){
      // if (input.keys.shift){
      //   this.parent.SetState('run');
      // }
      // else{
        this.parent.SetState('walk');
      }
        
      
    else if (input.keys.space) {
      this.parent.SetState('shoot');
    }
    else{
      return
    }
   
  }
};

class ShootState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'shoot';
  }

  Enter(prevState) {
    const curAction = this.parent.proxy.animations['shoot'].action;
    if (prevState) {
      const prevAction = this.parent.proxy.animations[prevState.Name].action;

      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input.keys.space) {
      if (input.keys.forward || input.keys.backward) {
        // if (input.keys.shift){
        //   this.parent.SetState('shootAndRun');
        // }
        // else{
          this.parent.SetState('shootAndWalk');
        
        
      }
      else{
        return
      }
    }
    else{
      this.parent.SetState('idle');
    }
     
  }
};

class ShootAndWalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'shootAndWalk';
  }

  Enter(prevState) {
    const curAction = this.parent.proxy.animations['shootAndWalk'].action;
    if (prevState) {
      const prevAction = this.parent.proxy.animations[prevState.Name].action;

      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input.keys.space) {
      if (input.keys.forward || input.keys.backward) {
        return
      }
      else{
        this.parent.SetState('shoot');
      }
    }
    else if (input.keys.forward || input.keys.backward) {
      this.parent.SetState('walk');
    }
    else{
      this.parent.SetState('idle');
    }
     
  }
};

class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'walk';
  }

  Enter(prevState) {
    const curAction = this.parent.proxy.animations['walk'].action;
    if (prevState) {
      const prevAction = this.parent.proxy.animations[prevState.Name].action;

      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input.keys.forward || input.keys.backward) {
      if (input.keys.space){
        this.parent.SetState('shootAndWalk');
      }
      else{
        return;
      }
    }
    else if (input.keys.space) {
      this.parent.SetState('shoot');
    }
    else{
      this.parent.SetState('idle');
    }
  }
};

// class RunState extends State {
//   constructor(parent) {
//     super(parent);
//   }

//   get Name() {
//     return 'run';
//   }

//   Enter(prevState) {
//     const curAction = this.parent.proxy.animations['run'].action;
//     if (prevState) {
//       const prevAction = this.parent.proxy.animations[prevState.Name].action;

//       if (prevState.Name == 'walk') {
//         const ratio = curAction.getClip().duration / prevAction.getClip().duration;
//         curAction.time = prevAction.time * ratio;
//       } else {
//         curAction.time = 0.0;
//         curAction.setEffectiveTimeScale(1.0);
//         curAction.setEffectiveWeight(1.0);
//       }

//       curAction.crossFadeFrom(prevAction, 0.5, true);
//       curAction.play();
//     } else {
//       curAction.play();
//     }
//   }

//   Exit() {
//   }

//   Update(timeElapsed, input) {
//     if (input.keys.forward || input.keys.backward) {
//       if (!input.keys.shift){
//         if(input.keys.space){
//           this.parent.SetState('shootAndWalk');
//         }
//         else{
//           this.parent.SetState('walk');
//         }
//       }
//       else if (input.keys.space){
//         this.parent.SetState('shootAndRun');
//       }
//       else{
//         return;
//       }
//     }
//     else if (input.keys.space) {
//       this.parent.SetState('shoot');
//     }
//     else{
//       this.parent.SetState('idle');
//     }
//   }
// };

// class ShootAndRunState extends State {
//   constructor(parent) {
//     super(parent);
//   }

//   get Name() {
//     return 'shootAndRun';
//   }

//   Enter(prevState) {
//     const curAction = this.parent.proxy.animations['shootAndRun'].action;
//     if (prevState) {
//       const prevAction = this.parent.proxy.animations[prevState.Name].action;

//       if (prevState.Name == 'shootAndWalk') {
//         const ratio = curAction.getClip().duration / prevAction.getClip().duration;
//         curAction.time = prevAction.time * ratio;
//       } else {
//         curAction.time = 0.0;
//         curAction.setEffectiveTimeScale(1.0);
//         curAction.setEffectiveWeight(1.0);
//       }
//       curAction.crossFadeFrom(prevAction, 0.5, true);
//       curAction.play();
//     } else {
//       curAction.play();
//     }
//   }

//   Exit() {
//   }

//   Update(_, input) {
//     if (input.keys.space) {
//       if (input.keys.forward || input.keys.backward) {
//       // if (!input.keys.shift){
//       //   if(input.keys.space){
//       //     this.parent.SetState('shootAndWalk');
//       //   }
//       //   else{
//       //     this.parent.SetState('walk');
//       //   }
//       // }
//       // else if (input.keys.space){
//         return
//       }
//       else{
//         this.parent.SetState('shoot');
//       }
//     }
//     else if (input.keys.forward || input.keys.backward) {
//       this.parent.SetState('walk');
//     }
//     else{
//       this.parent.SetState('idle');
//     }
//   }
     
// };




// Main function

class MainFunction {
    constructor() {
      this.Initialize();
    }
  
    Initialize() {

     //Create renderer

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor('rgb(255, 255, 150)', 1.0);

      //Apply shadow map property

      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Add the rendered image in the HTML DOM
      document.body.appendChild(this.renderer.domElement);
  
      window.addEventListener('resize', () => {
        this.OnWindowResize();
      }, false);
      

      // Add perspective camera
      const fov = 60;
      const aspect = window.innerWidth / window.innerHeight;
      const near = 1.0;
      const far = 1000.0;
      this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this.camera.position.set(75, 20, 0);
      

      // Initialize scene
      this.scene = new THREE.Scene();

      // Add directional light
      let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
      light.position.set(20, 100, 10);
      light.target.position.set(0, 0, 0);
      light.castShadow = true;
      light.shadow.bias = -0.001;
      light.shadow.mapSize.width = 2048;
      light.shadow.mapSize.height = 2048;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 500.0;
      light.shadow.camera.left = 100;
      light.shadow.camera.right = -100;
      light.shadow.camera.top = 100;
      light.shadow.camera.bottom = -100;
      this.scene.add(light);
      
      // Add ambient light
      light = new THREE.AmbientLight(0xFFFFFF, 4.0);
      this.scene.add(light);
  
      // Add orbit controls 
      const controls = new OrbitControls(
        this.camera, this.renderer.domElement);
      controls.target.set(0, 20, 0);
      controls.update();

      // Load skybox texture

      const cubeTextureLoader = new THREE.CubeTextureLoader();
      cubeTextureLoader.setPath('resources/skybox/');
      const texture = cubeTextureLoader.load([
        'skybox_left.png',
        'skybox_right.png',
        'skybox_up.png',
        'skybox_down.png',
        'skybox_front.png',
        'skybox_back.png',
      ]);
      this.scene.background = texture;

  

      // Add a plane 
      const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(200, 200, 10, 10),
          new THREE.MeshStandardMaterial({
              color: 0x202020,
            }));
      plane.castShadow = false;
      plane.receiveShadow = true;
      plane.rotation.x = -Math.PI / 2;
      this.scene.add(plane);

      this.mixers = [];
      this.previousRAF = null;
  
      this.LoadAnimatedModel();
      this.RAF();

    };

    //Load the model

    LoadAnimatedModel(){

      const params = {
        camera: this.camera,
        scene: this.scene,
      }
      this.controlsA = new CharacterController(params);

    };

    // LoadAnimatedModel() {
    //     const loader = new FBXLoader();
    //     loader.setPath('./resources/models/Player/');
    //     loader.load('PlayerModel.fbx', (fbx) => {
    //       fbx.scale.setScalar(0.1);
    //       fbx.traverse(c => {
    //         c.castShadow = true;
    //       });
    //       //Add the animation
    //       const anim = new FBXLoader();
    //       anim.setPath('./resources/models/Player/animations/');
    //       anim.load('PlayerIdle.fbx', (anim) => {
    //         const m = new THREE.AnimationMixer(fbx);
    //         this.mixers.push(m);
    //         const idle = m.clipAction(anim.animations[0]);
    //         idle.play();
    //       });
    //       this.scene.add(fbx);
    //     });
    //  }
      OnWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      };
          
      // Request animation frame
      RAF() {
        requestAnimationFrame((t) => {
          if (this.previousRAF == null) {
            this.previousRAF = t;
          }

          this.RAF();
          
          this.renderer.render(this.scene, this.camera);
          this.NextFrame(t - this.previousRAF);
          this.previousRAF = t;
         
        });
      };
  
      NextFrame(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this.mixers) {
          this.mixers.map(m => m.update(timeElapsedS));
        }

        if (this.controlsA) {
          this.controlsA.Update(timeElapsedS);
        }
      };
}

    
let APP = null;
    
window.addEventListener('DOMContentLoaded', () => {
  APP = new MainFunction();
});
