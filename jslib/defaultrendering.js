// Copyright (c) 2009-2014 Turbulenz Limited
;

;

var DefaultRendering = (function () {
    function DefaultRendering() {
    }
    /* tslint:disable:no-empty */
    DefaultRendering.prototype.updateShader = function (/* sm */ ) {
    };

    /* tslint:enable:no-empty */
    DefaultRendering.prototype.sortRenderablesAndLights = function (camera, scene) {
        var opaque = DefaultRendering.passIndex.opaque;
        var decal = DefaultRendering.passIndex.decal;
        var transparent = DefaultRendering.passIndex.transparent;

        var passes = this.passes;
        var opaquePass = passes[opaque];
        var decalPass = passes[decal];
        var transparentPass = passes[transparent];

        var numOpaque = 0;
        var numDecal = 0;
        var numTransparent = 0;

        var drawParametersArray;
        var numDrawParameters;
        var drawParameters;
        var drawParametersIndex;

        var visibleRenderables = scene.getCurrentVisibleRenderables();
        var numVisibleRenderables = visibleRenderables.length;
        if (numVisibleRenderables > 0) {
            var renderable, passIndex;
            var n = 0;
            do {
                renderable = visibleRenderables[n];

                if (!renderable.renderUpdate) {
                    var effect = renderable.sharedMaterial.effect;
                    if (effect.prepare) {
                        effect.prepare(renderable);
                    }
                }

                renderable.renderUpdate(camera);

                drawParametersArray = renderable.drawParameters;
                numDrawParameters = drawParametersArray.length;
                for (drawParametersIndex = 0; drawParametersIndex < numDrawParameters; drawParametersIndex += 1) {
                    drawParameters = drawParametersArray[drawParametersIndex];
                    passIndex = drawParameters.userData.passIndex;
                    if (passIndex === opaque) {
                        opaquePass[numOpaque] = drawParameters;
                        numOpaque += 1;
                    } else if (passIndex === transparent) {
                        if (renderable.sharedMaterial.meta.far) {
                            drawParameters.sortKey = 1.e38;
                        } else {
                            drawParameters.sortKey = renderable.distance;
                        }

                        transparentPass[numTransparent] = drawParameters;
                        numTransparent += 1;
                    } else if (passIndex === decal) {
                        decalPass[numDecal] = drawParameters;
                        numDecal += 1;
                    }
                }

                // this renderer does not care about lights
                n += 1;
            } while(n < numVisibleRenderables);
        }

        opaquePass.length = numOpaque;
        decalPass.length = numDecal;
        transparentPass.length = numTransparent;
    };

    DefaultRendering.prototype.update = function (gd, camera, scene, currentTime) {
        scene.updateVisibleNodes(camera);

        this.sortRenderablesAndLights(camera, scene);

        var matrix = camera.matrix;
        if (matrix[9] !== this.eyePosition[0] || matrix[10] !== this.eyePosition[1] || matrix[11] !== this.eyePosition[2]) {
            this.eyePositionUpdated = true;
            this.eyePosition[0] = matrix[9];
            this.eyePosition[1] = matrix[10];
            this.eyePosition[2] = matrix[11];
        } else {
            this.eyePositionUpdated = false;
        }

        /* tslint:disable:no-string-literal */
        this.globalTechniqueParameters['time'] = currentTime;

        /* tslint:enable:no-string-literal */
        this.camera = camera;
        this.scene = scene;
    };

    DefaultRendering.prototype.updateBuffers = function (gd, deviceWidth, deviceHeight) {
        return true;
    };

    DefaultRendering.prototype.draw = function (gd, clearColor, drawDecalsFn, drawTransparentFn, drawDebugFn) {
        gd.clear(clearColor, 1.0, 0);

        if (this.wireframe) {
            this.scene.drawWireframe(gd, this.sm, this.camera, this.wireframeInfo);

            if (drawDecalsFn) {
                drawDecalsFn();
            }

            if (drawTransparentFn) {
                drawTransparentFn();
            }
        } else {
            var globalTechniqueParametersArray = this.globalTechniqueParametersArray;
            var passes = this.passes;

            gd.drawArray(passes[DefaultRendering.passIndex.opaque], globalTechniqueParametersArray, -1);

            gd.drawArray(passes[DefaultRendering.passIndex.decal], globalTechniqueParametersArray, -1);

            if (drawDecalsFn) {
                drawDecalsFn();
            }

            gd.drawArray(passes[DefaultRendering.passIndex.transparent], globalTechniqueParametersArray, 1);

            if (drawTransparentFn) {
                drawTransparentFn();
            }
        }

        if (drawDebugFn) {
            drawDebugFn();
        }

        this.lightPositionUpdated = false;
    };

    DefaultRendering.prototype.setGlobalLightPosition = function (pos) {
        this.lightPositionUpdated = true;
        this.lightPosition[0] = pos[0];
        this.lightPosition[1] = pos[1];
        this.lightPosition[2] = pos[2];
    };

    /* tslint:disable:no-string-literal */
    DefaultRendering.prototype.setGlobalLightColor = function (color) {
        this.globalTechniqueParameters['lightColor'] = color;
    };

    DefaultRendering.prototype.setAmbientColor = function (color) {
        this.globalTechniqueParameters['ambientColor'] = color;
    };

    DefaultRendering.prototype.setDefaultTexture = function (tex) {
        this.globalTechniqueParameters['diffuse'] = tex;
    };

    /* tslint:enable:no-string-literal */
    DefaultRendering.prototype.setWireframe = function (wireframeEnabled, wireframeInfo) {
        this.wireframeInfo = wireframeInfo;
        this.wireframe = wireframeEnabled;
    };

    DefaultRendering.prototype.getDefaultSkinBufferSize = function () {
        return this.defaultSkinBufferSize;
    };

    DefaultRendering.prototype.destroy = function () {
        delete this.globalTechniqueParametersArray;
        delete this.globalTechniqueParameters;
        delete this.lightPosition;
        delete this.eyePosition;
        delete this.passes;
    };

    DefaultRendering.defaultPrepareFn = //
    // defaultPrepareFn
    //
    function (geometryInstance) {
        var drawParameters = TurbulenzEngine.getGraphicsDevice().createDrawParameters();
        drawParameters.userData = {};
        geometryInstance.drawParameters = [drawParameters];
        geometryInstance.prepareDrawParameters(drawParameters);

        var sharedMaterial = geometryInstance.sharedMaterial;
        var techniqueParameters = geometryInstance.techniqueParameters;

        if (!sharedMaterial.techniqueParameters.materialColor && !techniqueParameters.materialColor) {
            sharedMaterial.techniqueParameters.materialColor = DefaultRendering.v4One;
        }

        if (!sharedMaterial.techniqueParameters.uvTransform && !techniqueParameters.uvTransform) {
            sharedMaterial.techniqueParameters.uvTransform = DefaultRendering.identityUVTransform;
        }

        // NOTE: the way this functions is called, 'this' is an
        // EffectPrepareObject.
        drawParameters.technique = (this).technique;

        drawParameters.setTechniqueParameters(0, sharedMaterial.techniqueParameters);
        drawParameters.setTechniqueParameters(1, techniqueParameters);

        if (sharedMaterial.meta.decal) {
            drawParameters.userData.passIndex = DefaultRendering.passIndex.decal;
        } else if (sharedMaterial.meta.transparent) {
            drawParameters.userData.passIndex = DefaultRendering.passIndex.transparent;
        } else {
            drawParameters.userData.passIndex = DefaultRendering.passIndex.opaque;
        }

        var node = geometryInstance.node;
        if (!node.rendererInfo) {
            var md = TurbulenzEngine.getMathDevice();
            node.rendererInfo = {
                id: DefaultRendering.nextRenderinfoID,
                frameVisible: -1,
                worldUpdate: -1,
                worldViewProjection: md.m44BuildIdentity(),
                worldInverse: md.m43BuildIdentity(),
                eyePosition: md.v3BuildZero(),
                lightPosition: md.v3BuildZero()
            };
            DefaultRendering.nextRenderinfoID += 1;
        }

        // do this once instead of for every update
        var rendererInfo = node.rendererInfo;
        techniqueParameters.worldViewProjection = rendererInfo.worldViewProjection;
        techniqueParameters.lightPosition = rendererInfo.lightPosition;

        var techniqueName = (this).technique.name;
        if (techniqueName.indexOf("flat") === -1 && techniqueName.indexOf("lambert") === -1) {
            techniqueParameters.eyePosition = rendererInfo.eyePosition;
        }

        var skinController = geometryInstance.skinController;
        if (skinController) {
            techniqueParameters.skinBones = skinController.output;
            if (skinController.index === undefined) {
                skinController.index = DefaultRendering.nextSkinID;
                DefaultRendering.nextSkinID += 1;
            }
            drawParameters.sortKey = -renderingCommonSortKeyFn((this).techniqueIndex, skinController.index, sharedMaterial.meta.materialIndex);
        } else {
            drawParameters.sortKey = renderingCommonSortKeyFn((this).techniqueIndex, sharedMaterial.meta.materialIndex, rendererInfo.id);
        }

        geometryInstance.renderUpdate = (this).update;
    };

    DefaultRendering.create = //
    // Constructor function
    //
    function (gd, md, shaderManager, effectsManager) {
        var dr = new DefaultRendering();

        dr.md = md;
        dr.sm = shaderManager;

        dr.lightPositionUpdated = true;
        dr.lightPosition = md.v3Build(1000.0, 1000.0, 0.0);
        dr.eyePositionUpdated = true;
        dr.eyePosition = md.v3BuildZero();

        dr.globalTechniqueParameters = gd.createTechniqueParameters({
            lightColor: md.v3BuildOne(),
            ambientColor: md.v3Build(0.2, 0.2, 0.3),
            time: 0.0
        });
        dr.globalTechniqueParametersArray = [dr.globalTechniqueParameters];

        dr.passes = [[], [], []];

        var onShaderLoaded = function onShaderLoadedFn(shader) {
            var skinBones = shader.getParameter("skinBones");
            dr.defaultSkinBufferSize = skinBones.rows * skinBones.columns;
        };

        shaderManager.load("shaders/defaultrendering.cgfx", onShaderLoaded);
        shaderManager.load("shaders/debug.cgfx");

        // Update effects
        var updateNodeRendererInfo = function updateNodeRendererInfoFn(node, rendererInfo, camera) {
            var lightPositionUpdated = dr.lightPositionUpdated;
            var eyePositionUpdated = dr.eyePositionUpdated;
            var matrix = node.world;
            if (rendererInfo.worldUpdate !== node.worldUpdate) {
                rendererInfo.worldUpdate = node.worldUpdate;
                lightPositionUpdated = true;
                eyePositionUpdated = true;
                rendererInfo.worldInverse = md.m43Inverse(matrix, rendererInfo.worldInverse);
            }
            if (lightPositionUpdated) {
                rendererInfo.lightPosition = md.m43TransformPoint(rendererInfo.worldInverse, dr.lightPosition, rendererInfo.lightPosition);
            }
            if (eyePositionUpdated) {
                rendererInfo.eyePosition = md.m43TransformPoint(rendererInfo.worldInverse, dr.eyePosition, rendererInfo.eyePosition);
            }
            rendererInfo.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, rendererInfo.worldViewProjection);
        };

        var defaultUpdate = function defaultUpdateFn(camera) {
            var node = this.node;
            var rendererInfo = node.rendererInfo;
            if (rendererInfo.frameVisible !== node.frameVisible) {
                rendererInfo.frameVisible = node.frameVisible;
                updateNodeRendererInfo(node, rendererInfo, camera);
            }
        };

        var defaultSkinnedUpdate = function defaultSkinnedUpdateFn(camera) {
            var node = this.node;
            var rendererInfo = node.rendererInfo;
            if (rendererInfo.frameVisible !== node.frameVisible) {
                rendererInfo.frameVisible = node.frameVisible;
                updateNodeRendererInfo(node, rendererInfo, camera);
            }

            var skinController = this.skinController;
            if (skinController) {
                skinController.update();
            }
        };

        var debugUpdate = function debugUpdateFn(camera) {
            var matrix = this.node.world;
            var tp = this.techniqueParameters;
            tp.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, tp.worldViewProjection);
            tp.worldInverseTranspose = md.m33InverseTranspose(matrix, tp.worldInverseTranspose);
        };

        var debugSkinnedUpdate = function debugSkinnedUpdateFn(camera) {
            var matrix = this.node.world;
            var tp = this.techniqueParameters;
            tp.worldViewProjection = md.m43MulM44(matrix, camera.viewProjectionMatrix, tp.worldViewProjection);
            tp.worldInverseTranspose = md.m33InverseTranspose(matrix, tp.worldInverseTranspose);

            var skinController = this.skinController;
            if (skinController) {
                skinController.update();
            }
        };

        var defaultEnvUpdate = function defaultEnvUpdateFn(camera) {
            var node = this.node;
            var rendererInfo = node.rendererInfo;
            if (rendererInfo.frameVisible !== node.frameVisible) {
                rendererInfo.frameVisible = node.frameVisible;
                updateNodeRendererInfo(node, rendererInfo, camera);
            }
            if (rendererInfo.worldUpdateEnv !== node.worldUpdate) {
                rendererInfo.worldUpdateEnv = node.worldUpdate;
                var matrix = node.world;
                rendererInfo.worldInverseTranspose = md.m33InverseTranspose(matrix, rendererInfo.worldInverseTranspose);
            }

            var techniqueParameters = this.techniqueParameters;
            techniqueParameters.worldInverseTranspose = rendererInfo.worldInverseTranspose;
        };

        var defaultEnvSkinnedUpdate = function defaultEnvSkinnedUpdateFn(camera) {
            defaultEnvUpdate.call(this, camera);

            var skinController = this.skinController;
            if (skinController) {
                skinController.update();
            }
        };

        // Prepare
        var debugLinesPrepare = function debugLinesPrepareFn(geometryInstance) {
            DefaultRendering.defaultPrepareFn.call(this, geometryInstance);
            var techniqueParameters = geometryInstance.techniqueParameters;
            techniqueParameters.constantColor = geometryInstance.sharedMaterial.meta.constantColor;
        };

        var defaultPrepare = function defaultPrepareFn(geometryInstance) {
            DefaultRendering.defaultPrepareFn.call(this, geometryInstance);

            //For untextured objects we need to choose a technique that uses materialColor instead.
            var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
            var diffuse = techniqueParameters.diffuse;
            if (diffuse === undefined) {
                if (!techniqueParameters.materialColor) {
                    techniqueParameters.materialColor = md.v4BuildOne();
                }
            } else if (diffuse.length === 4) {
                techniqueParameters.materialColor = md.v4Build.apply(md, diffuse);
                diffuse = techniqueParameters.diffuse_map;
                techniqueParameters.diffuse = diffuse;
            }
            if (!diffuse) {
                var shader = shaderManager.get("shaders/defaultrendering.cgfx");
                if (geometryInstance.geometryType === "skinned") {
                    geometryInstance.drawParameters[0].technique = shader.getTechnique("flat_skinned");
                } else {
                    geometryInstance.drawParameters[0].technique = shader.getTechnique("flat");
                }
            }
        };

        var noDiffusePrepare = function noDiffusePrepareFn(geometryInstance) {
            DefaultRendering.defaultPrepareFn.call(this, geometryInstance);

            //For untextured objects we need to choose a technique that uses materialColor instead.
            var techniqueParameters = geometryInstance.sharedMaterial.techniqueParameters;
            var diffuse = techniqueParameters.diffuse;
            if (diffuse === undefined) {
                if (!techniqueParameters.materialColor) {
                    techniqueParameters.materialColor = md.v4BuildOne();
                }
            } else if (diffuse.length === 4) {
                techniqueParameters.materialColor = md.v4Build.apply(md, diffuse);
                techniqueParameters.diffuse = undefined;
            }
        };

        var loadTechniques = function loadTechniquesFn(shaderManager) {
            var that = this;

            var callback = function shaderLoadedCallbackFn(shader) {
                that.shader = shader;
                that.technique = shader.getTechnique(that.techniqueName);
                that.techniqueIndex = that.technique.id;
            };
            shaderManager.load(this.shaderName, callback);
        };

        dr.defaultPrepareFn = defaultPrepare;
        dr.defaultUpdateFn = defaultUpdate;
        dr.defaultSkinnedUpdateFn = defaultSkinnedUpdate;
        dr.loadTechniquesFn = loadTechniques;

        var effect;
        var effectTypeData;
        var skinned = "skinned";
        var rigid = "rigid";

        // Register the effects
        //
        // constant
        //
        effect = Effect.create("constant");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "flat",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "flat_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // constant_nocull
        //
        effect = Effect.create("constant_nocull");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "flat_nocull",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "flat_skinned_nocull",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // lambert
        //
        effect = Effect.create("lambert");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "lambert",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "lambert_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // blinn
        //
        effect = Effect.create("blinn");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blinn",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blinn_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // blinn_nocull
        //
        effect = Effect.create("blinn_nocull");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blinn_nocull",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blinn_skinned_nocull",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // phong
        //
        effect = Effect.create("phong");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "phong",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "phong_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // debug_lines_constant
        //
        effect = Effect.create("debug_lines_constant");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: debugLinesPrepare,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_lines_constant",
            update: debugUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // debug_normals
        //
        effect = Effect.create("debug_normals");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: DefaultRendering.defaultPrepareFn,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_normals",
            update: debugUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: DefaultRendering.defaultPrepareFn,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_normals_skinned",
            update: debugSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // debug_tangents
        //
        effect = Effect.create("debug_tangents");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: DefaultRendering.defaultPrepareFn,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_tangents",
            update: debugUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: DefaultRendering.defaultPrepareFn,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_tangents_skinned",
            update: debugSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // debug_binormals
        //
        effect = Effect.create("debug_binormals");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: DefaultRendering.defaultPrepareFn,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_binormals",
            update: debugUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: DefaultRendering.defaultPrepareFn,
            shaderName: "shaders/debug.cgfx",
            techniqueName: "debug_binormals_skinned",
            update: debugSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // normalmap
        //
        effect = Effect.create("normalmap");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // normalmap_specularmap
        //
        effect = Effect.create("normalmap_specularmap");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // normalmap_specularmap_alphamap
        //
        effect = Effect.create("normalmap_specularmap_alphamap");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap_alphamap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // normalmap_alphatest
        //
        effect = Effect.create("normalmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_alphatest",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_alphatest_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // normalmap_specularmap_alphatest
        //
        effect = Effect.create("normalmap_specularmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap_alphatest",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap_alphatest_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // normalmap_glowmap
        //
        effect = Effect.create("normalmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_glowmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_glowmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // normalmap_specularmap_glowmap
        //
        effect = Effect.create("normalmap_specularmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap_glowmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "normalmap_specularmap_glowmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // rxgb_normalmap
        //
        effect = Effect.create("rxgb_normalmap");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // rxgb_normalmap_specularmap
        //
        effect = Effect.create("rxgb_normalmap_specularmap");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_specularmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_specularmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // rxgb_normalmap_alphatest
        //
        effect = Effect.create("rxgb_normalmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_alphatest",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_alphatest_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // rxgb_normalmap_specularmap_alphatest
        //
        effect = Effect.create("rxgb_normalmap_specularmap_alphatest");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_specularmap_alphatest",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_specularmap_alphatest_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // rxgb_normalmap_glowmap
        //
        effect = Effect.create("rxgb_normalmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_glowmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_glowmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // rxgb_normalmap_specularmap_glowmap
        //
        effect = Effect.create("rxgb_normalmap_specularmap_glowmap");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_specularmap_glowmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "rxgb_normalmap_specularmap_glowmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // add
        //
        effect = Effect.create("add");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "add",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "add_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // add_particle
        //
        effect = Effect.create("add_particle");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "add_particle",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // blend
        //
        effect = Effect.create("blend");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blend",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blend_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // blend_particle
        //
        effect = Effect.create("blend_particle");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "blend_particle",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // translucent
        //
        effect = Effect.create("translucent");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "translucent",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "translucent_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // translucent_particle
        //
        effect = Effect.create("translucent_particle");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "translucent_particle",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // filter
        //
        effect = Effect.create("filter");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "filter",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "filter_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // invfilter
        //
        effect = Effect.create("invfilter");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "invfilter",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // invfilter_particle
        //
        effect = Effect.create("invfilter_particle");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "invfilter_particle",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // glass
        //
        effect = Effect.create("glass");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "glass",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // glass_env
        //
        effect = Effect.create("glass_env");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "glass_env",
            update: defaultEnvUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // modulate2
        //
        effect = Effect.create("modulate2");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "modulate2",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "modulate2_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // skybox
        //
        effect = Effect.create("skybox");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "skybox",
            update: defaultEnvUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        //
        // env
        //
        effect = Effect.create("env");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "env",
            update: defaultEnvUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "env_skinned",
            update: defaultEnvSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // flare
        //
        effect = Effect.create("flare");
        effectsManager.add(effect);
        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "add",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectsManager.map("default", "blinn");

        //
        // glowmap
        //
        effect = Effect.create("glowmap");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "glowmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        effectTypeData = {
            prepare: noDiffusePrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "glowmap_skinned",
            update: defaultSkinnedUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(skinned, effectTypeData);

        //
        // lightmap
        //
        effect = Effect.create("lightmap");
        effectsManager.add(effect);

        effectTypeData = {
            prepare: defaultPrepare,
            shaderName: "shaders/defaultrendering.cgfx",
            techniqueName: "lightmap",
            update: defaultUpdate,
            loadTechniques: loadTechniques
        };
        effectTypeData.loadTechniques(shaderManager);
        effect.add(rigid, effectTypeData);

        return dr;
    };
    DefaultRendering.version = 1;

    DefaultRendering.numPasses = 3;

    DefaultRendering.passIndex = {
        opaque: 0,
        decal: 1,
        transparent: 2
    };

    DefaultRendering.nextRenderinfoID = 0;
    DefaultRendering.nextSkinID = 0;

    DefaultRendering.v4One = new Float32Array([1.0, 1.0, 1.0, 1.0]);
    DefaultRendering.identityUVTransform = new Float32Array([1, 0, 0, 1, 0, 0]);
    return DefaultRendering;
})();
