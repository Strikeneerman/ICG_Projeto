import * as THREE from 'three';

import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

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
      

      // Add camera
      const fov = 60;
      const aspect = 1920 / 1080;
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
          new THREE.PlaneGeometry(100, 100, 10, 10),
          new THREE.MeshStandardMaterial({
              color: 0x202020,
            }));
      plane.castShadow = false;
      plane.receiveShadow = true;
      plane.rotation.x = -Math.PI / 2;
      this.scene.add(plane);
  
      this.previousRAF = null;
  
      //this.LoadModel();
      this.RAF();
    }
    //   LoadModel() {
    //     const loader = new GLTFLoader();
    //     loader.load('./resources/thing.glb', (gltf) => {
    //       gltf.scene.traverse(c => {
    //         c.castShadow = true;
    //       });
    //       this.scene.add(gltf.scene);
    //     });
    //   }
    
      OnWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      }
    
      RAF() {
        requestAnimationFrame(() => {
        //   if (this.previousRAF === null) {
        //     this.previousRAF = t;
        //   }
    
         
    
          this.renderer.render(this.scene, this.camera);
          this.RAF();
        //   this.Step(t - this.previousRAF);
        //   this.previousRAF = t;
        });
      }
    
    //   Step(timeElapsed) {
    //     const timeElapsedS = timeElapsed * 0.001;
    //     if (this._mixers) {
    //       this._mixers.map(m => m.update(timeElapsedS));
    //     }
    
    //     if (this._controls) {
    //       this._controls.Update(timeElapsedS);
    //     }
    //   }
}

    
let APP = null;
    
    window.addEventListener('DOMContentLoaded', () => {
      APP = new MainFunction();
    });
