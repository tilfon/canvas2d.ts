﻿/// <reference path="action.ts" />
/// <reference path="uievent.ts" />
/// <reference path="sprite.ts" />

namespace canvas2d.Stage {

    var timerID: number;
    var lastUpdate: number;
    var bufferCanvas: HTMLCanvasElement;
    var bufferContext: CanvasRenderingContext2D;
    var stageScaleMode: ScaleMode;

    /**
     * FPS value
     */
    export var fps: number = 30;
    export var width: number;
    export var height: number;
    
    /**
     * Game running state
     */
    export var isRunning: boolean = false;

    /**
     * Set the stage could recieve touch event
     */
    export var touchEnabled: boolean = false;
    
    /**
     * Set the stage could recieve mouse event
     */
    export var mouseEnabled: boolean = false;
    
    /**
     * Set the stage could recieve keyboard event
     */
    export var keyboardEnabled: boolean = false;

    /**
     * Canvas element of this stage
     */
    export var canvas: HTMLCanvasElement;
    
    /**
     * Canvas rendering context2d object
     */
    export var context: CanvasRenderingContext2D;

    /**
     * Root sprite container of the stage
     */
    export var sprite: Sprite;
    
    /**
     * Visible rectangle after adjusting for resolution design
     */
    export var visibleRect: { left: number; right: number; top: number; bottom: number };

    /**
     *  Scale mode for adjusting resolution design
     */
    export enum ScaleMode {
        SHOW_ALL,
        NO_BORDER,
        FIX_WIDTH,
        FIX_HEIGHT
    }
    
    /**
     * Scale value for adjusting the resolution design
     */
    export var _scale: number;

    function adjustStageSize(): void {
        var style = canvas.style;
        var device = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        var scaleX: number = device.width / Stage.width;
        var scaleY: number = device.height / Stage.height;
        var deltaWidth: number = 0;
        var deltaHeight: number = 0;
        var scale: number;
        var width: number;
        var height: number;

        switch (stageScaleMode) {
            case ScaleMode.SHOW_ALL:
                if (scaleX < scaleY) {
                    scale = scaleX;
                    width = device.width;
                    height = scale * Stage.height;
                }
                else {
                    scale = scaleY;
                    width = scale * Stage.width;
                    height = device.height;
                }
                break;
            case ScaleMode.NO_BORDER:
                if (scaleX > scaleY) {
                    scale = scaleX;
                }
                else {
                    scale = scaleY;
                }
                width = Stage.width * scale;
                height = Stage.height * scale;
                deltaWidth = (Stage.width - device.width / scale) * 0.5 | 0;
                deltaHeight = (Stage.height - device.height / scale) * 0.5 | 0;
                break;
            case ScaleMode.FIX_WIDTH:
                scale = scaleX;
                width = device.width;
                height = device.height * scale;
                deltaHeight = (Stage.height - device.height / scale) * 0.5 | 0;
                break;
            case ScaleMode.FIX_HEIGHT:
                scale = scaleY;
                width = scale * device.width;
                height = device.height;
                deltaWidth = (Stage.width - device.width / scale) * 0.5 | 0;
                break;
            default:
                throw new Error('Unknow stage scale mode "' + stageScaleMode + '"');
        }

        style.width = width + 'px';
        style.height = height + 'px';
        style.top = ((device.height - height) * 0.5) + 'px';
        style.left = ((device.width - width) * 0.5) + 'px';
        style.position = 'absolute';

        visibleRect.left += deltaWidth;
        visibleRect.right -= deltaWidth;
        visibleRect.top += deltaHeight;
        visibleRect.bottom -= deltaHeight;

        _scale = scale;
    }

    function initScreenEvent(): void {
        window.addEventListener("resize", adjustStageSize);
    }

    function getDeltaTime(): number {
        var now = Date.now();
        var delta = now - lastUpdate;

        lastUpdate = now;
        return delta / 1000;
    }

    export function step(deltaTime: number): void {
        var width: number = canvas.width;
        var height: number = canvas.height;

        Action._update(deltaTime);
        sprite._update(deltaTime);

        bufferContext.clearRect(0, 0, width, height);

        sprite._visit(bufferContext);

        context.clearRect(0, 0, width, height);
        context.drawImage(bufferCanvas, 0, 0, width, height);
    }

    /**
     * Initialize the stage
     * @param  canvas     Canvas element
     * @param  width      Resolution design width
     * @param  height     Resolution design height
     * @param  scaleMode  Adjust resolution design scale mode 
     */
    export function init(canvas: HTMLCanvasElement, width: number, height: number, scaleMode: ScaleMode): void {
        sprite = new Sprite({
            x: width * 0.5,
            y: height * 0.5,
            width: width,
            height: height
        });


        stageScaleMode = scaleMode;

        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        bufferCanvas = document.createElement("canvas");
        bufferContext = bufferCanvas.getContext("2d");

        this.width = canvas.width = bufferCanvas.width = width;
        this.height = canvas.height = bufferCanvas.height = height;

        visibleRect = { left: 0, right: width, top: 0, bottom: height };

        adjustStageSize();
        initScreenEvent();
    }

    function startTimer() {
        timerID = setTimeout(() => {
            var deltaTime: number = getDeltaTime();
            step(deltaTime);
            startTimer();
        }, 1000 / fps);
    }

    /**
     * Start the stage event loop
     */
    export function start(useOuterTimer?: boolean): void {
        if (!isRunning) {
            if (!useOuterTimer) {
                lastUpdate = Date.now();
                startTimer();
            }

            UIEvent.__register();
            isRunning = true;
        }
    }

    /**
     * Stop the stage event loop
     */
    export function stop(): void {
        if (!isRunning) {
            return;
        }

        clearTimeout(timerID);
        UIEvent.__unregister();
        isRunning = false;
    }

    /**
     * Add sprite to the stage
     */
    export function addChild(child: Sprite): void {
        sprite.addChild(child);
    }

    /**
     * Remove sprite from the stage
     */
    export function removeChild(child: Sprite): void {
        sprite.removeChild(child);
    }

    /**
     * Remove all sprites from the stage
     * @param  recusive  Recusize remove all the children
     */
    export function removeAllChild(recusive?: boolean): void {
        sprite.removeAllChild(recusive);
    }
}