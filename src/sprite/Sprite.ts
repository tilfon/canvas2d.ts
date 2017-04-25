import { EventHelper, UIEvent } from '../UIEvent';
import { Color, convertColor, uid } from '../Util';
import { Action } from '../action/Action';
import { Texture } from '../Texture';
import { EventEmitter } from '../EventEmitter';
import { ReleasePool } from '../ReleasePool';
import { Stage } from '../Stage';

export const RAD_PER_DEG: number = Math.PI / 180;

export enum AlignType {
    TOP,
    RIGHT,
    BOTTOM,
    LEFT,
    CENTER
}

export class Sprite<T extends ISprite> extends EventEmitter {

    protected _props: T & ISprite; // Define for tsx

    protected _width: number = 0;
    protected _height: number = 0;
    protected _originX: number = 0.5;
    protected _originY: number = 0.5;
    protected _rotation: number = 0;
    protected _rotationRad: number = 0;
    protected _texture: Texture;
    protected _alignX: AlignType;
    protected _alignY: AlignType;
    protected _parent: Sprite<T>;
    protected _stage: Stage;

    protected _top: number;
    protected _right: number;
    protected _bottom: number;
    protected _left: number;

    protected _percentWidth: number;
    protected _percentHeight: number;

    protected _originPixelX: number = 0;
    protected _originPixelY: number = 0;

    protected _grid: number[];

    id: number;

    x: number = 0;
    y: number = 0;
    scaleX: number = 1;
    scaleY: number = 1;
    radius: number = 0;
    opacity: number = 1;
    sourceX: number = 0;
    sourceY: number = 0;
    sourceWidth: number;
    sourceHeight: number;
    lighterMode: boolean = false;
    autoResize: boolean = true;
    flippedX: boolean = false;
    flippedY: boolean = false;
    visible: boolean = true;
    clipOverflow: boolean = false;
    bgColor: Color;
    borderColor: Color;
    borderWidth: number;
    children: Sprite<any>[];

    touchEnabled: boolean = true;
    mouseEnabled: boolean = true;

    onClick: ISprite["onClick"];
    onMouseBegin: ISprite["onMouseBegin"];
    onMouseMoved: ISprite["onMouseMoved"];
    onMouseEnded: ISprite["onMouseEnded"];
    onTouchBegin: ISprite["onTouchBegin"];
    onTouchMoved: ISprite["onTouchMoved"];
    onKeyDown: ISprite["onKeyDown"];
    onKeyUp: ISprite["onKeyUp"];
    onTouchEnded: ISprite["onTouchEnded"];

    constructor(props?: ISprite) {
        super();
        this.id = uid(this);
        this._init(props);
    }

    protected _init(attrs?: ISprite) {
        if (attrs) {
            Object.keys(attrs).forEach(name => this[name] = attrs[name]);
        }
    }

    set width(value: number) {
        if (this._width === value) {
            return;
        }

        this._width = value;
        this._originPixelX = this._width * this._originX;
        this._adjustAlignX();
        this._reLayoutChildrenOnWidthChanged();
    }

    get width(): number {
        return this._width;
    }

    set height(value: number) {
        if (this._height === value) {
            return;
        }

        this._height = value;
        this._originPixelY = this._height * this._originY;
        this._adjustAlignY();
        this._reLayoutChildrenOnHeightChanged();
    }

    get height(): number {
        return this._height;
    }

    set originX(value: number) {
        if (this._originX === value) {
            return;
        }

        this._originX = value;
        this._originPixelX = this._originX * this._width;
        this._adjustAlignX();
    }

    get originX(): number {
        return this._originX;
    }

    set originY(value: number) {
        if (this._originY === value) {
            return;
        }

        this._originY = value;
        this._originPixelY = this._originY * this._height;
        this._adjustAlignY();
    }

    get originY(): number {
        return this._originY;
    }

    get top() {
        return this._top;
    }

    set top(top: number) {
        this.autoResize = false;
        this._top = top;
        this._resizeHeight();
    }

    get right() {
        return this._right;
    }

    set right(right: number) {
        this.autoResize = false;
        this._right = right;
        this._resizeWidth();
    }

    get bottom() {
        return this._bottom;
    }

    set bottom(bottom: number) {
        this.autoResize = false;
        this._bottom = bottom;
        this._resizeHeight();
    }

    get left() {
        return this._left;
    }

    set left(left: number) {
        this.autoResize = false;
        this._left = left;
        this._resizeWidth();
    }

    get percentWidth() {
        return this._percentWidth;
    }

    set percentWidth(percentWidth: number) {
        this.autoResize = false;
        this._percentWidth = percentWidth;
        this._resizeWidth();
    }

    get percentHeight() {
        return this._percentHeight;
    }

    set percentHeight(percentHeight: number) {
        this.autoResize = false;
        this._percentHeight = percentHeight;
        this._resizeHeight();
    }

    get grid() {
        return this._grid;
    }

    set grid(grid: number[]) {
        this._grid = grid;
        this.autoResize = false;
    }

    set rotation(value: number) {
        if (this._rotation === value) {
            return;
        }

        this._rotation = value;
        this._rotationRad = this._rotation * RAD_PER_DEG;
    }

    get rotation(): number {
        return this._rotation;
    }

    set texture(value: Texture | string) {
        let texture: Texture;

        if (typeof value === 'string') {
            texture = Texture.create(value);
        }
        else {
            texture = value;
        }
        if (texture === this._texture) {
            return;
        }

        this._texture = texture;

        if (!this.autoResize) {
            return;
        }

        if (texture) {
            if (texture.ready) {
                this.width = texture.width;
                this.height = texture.height;
            }
            else {
                texture.onReady((size) => {
                    this.width = size.width;
                    this.height = size.height;
                });
            }
        }
        else {
            this.width = 0;
            this.height = 0;
        }
    }

    get texture() {
        return this._texture;
    }

    set parent(sprite: Sprite<any>) {
        if (sprite === this._parent) {
            return;
        }

        this._parent = sprite;

        if (sprite) {
            this._adjustAlignX();
            this._adjustAlignY();
        }
    }

    get parent() {
        return this._parent;
    }

    get stage() {
        return this._stage;
    }

    set stage(stage: Stage) {
        this._stage = stage;
        if (stage == null) {
            this.emit(UIEvent.REMOVED_FROM_STAGE);
        }
        else {
            this.emit(UIEvent.ADD_TO_STAGE);
        }
        this.children && this.children.forEach(child => child.stage = stage);
    }

    set alignX(value: AlignType) {
        if (this._alignX === value || value === AlignType.BOTTOM || value === AlignType.TOP) {
            return;
        }
        this._alignX = value;
        this._adjustAlignX();
    }

    get alignX() {
        return this._alignX;
    }

    set alignY(value: AlignType) {
        if (this._alignY === value || value === AlignType.LEFT || value === AlignType.RIGHT) {
            return;
        }
        this._alignY = value;
        this._adjustAlignY();
    }

    get alignY() {
        return this._alignY;
    }

    protected _update(deltaTime: number): void {
        this.emit(UIEvent.FRAME, deltaTime);
        this.update(deltaTime);

        if (this.children && this.children.length) {
            this.children.slice().forEach((child) => {
                child._update(deltaTime);
            });
        }
    }

    protected _visit(context: CanvasRenderingContext2D): void {
        if (!this.visible || this.opacity === 0) {
            return;
        }

        var sx: number = this.scaleX;
        var sy: number = this.scaleY;

        context.save();

        if (this.lighterMode) {
            context.globalCompositeOperation = "lighter";
        }
        if (this.x !== 0 || this.y !== 0) {
            context.translate(this.x, this.y);
        }
        if (this.opacity !== 1) {
            context.globalAlpha = this.opacity;
        }
        if (this.flippedX) {
            sx = -sx;
        }
        if (this.flippedY) {
            sy = -sy;
        }
        if (sx !== 1 || sy !== 1) {
            context.scale(sx, sy);
        }

        var rotationRad: number = this._rotationRad % 360;

        if (rotationRad !== 0) {
            context.rotate(rotationRad);
        }

        if ((this._width !== 0 && this._height !== 0) || this.radius > 0) {
            this.draw(context);
        }

        this._visitChildren(context);

        context.restore();
    }

    protected _reLayoutChildrenOnWidthChanged() {
        if (!this.children || !this.children.length) {
            return;
        }
        this.children.forEach(child => {
            child._resizeWidth();
            child._adjustAlignX();
        });
    }

    protected _reLayoutChildrenOnHeightChanged() {
        if (!this.children || !this.children.length) {
            return;
        }
        this.children.forEach(child => {
            child._resizeHeight();
            child._adjustAlignY();
        });
    }

    protected _resizeWidth() {
        if (this.parent == null) {
            return;
        }
        const { parent, percentWidth, right, left } = this;
        if (left != null && right != null) {
            this.width = parent.width - left - right;
            this.x = left + this._originPixelX;
        }
        else if (percentWidth != null) {
            this.width = parent.width * percentWidth;
        }
    }

    protected _resizeHeight() {
        if (this.parent == null) {
            return;
        }
        const { parent, percentHeight, top, bottom } = this;
        if (top != null && bottom != null) {
            this.height = parent.height - top - bottom;
            this.y = top + this._originPixelY;
        }
        else if (percentHeight != null) {
            this.height = parent.height * percentHeight;
        }
    }

    protected _adjustAlignX() {
        if (!this.parent || this._alignX == null) {
            return;
        }

        let x: number;
        let ox = this._originPixelX;

        switch (this._alignX) {
            case AlignType.LEFT:
                x = ox;
                break;
            case AlignType.RIGHT:
                x = this.parent.width - (this.width - ox);
                break;
            case AlignType.CENTER:
                x = this.parent.width * 0.5 + ox - this.width * 0.5;
                break;
        }

        if (x != null) {
            this.x = x;
        }
    }

    protected _adjustAlignY() {
        if (!this.parent || this._alignY == null) {
            return;
        }

        let y: number;
        let oy = this._originPixelY;

        switch (this._alignY) {
            case AlignType.TOP:
                y = oy;
                break;
            case AlignType.BOTTOM:
                y = this.parent.height - (this.height - oy);
                break;
            case AlignType.CENTER:
                y = this.parent.height * 0.5 + oy - this.height * 0.5;
                break;
        }

        if (y != null) {
            this.y = y;
        }
    }

    protected _visitChildren(context: CanvasRenderingContext2D): void {
        if (!this.children || !this.children.length) {
            return;
        }
        if (this._originPixelX !== 0 || this._originPixelY !== 0) {
            context.translate(-this._originPixelX, -this._originPixelY);
        }

        this.children.forEach((child) => {
            child._visit(context);
        });
    }

    protected _clip(context: CanvasRenderingContext2D) {
        if (!this.clipOverflow) {
            return;
        }

        context.beginPath();
        if (this.radius > 0) {
            context.arc(0, 0, this.radius, 0, Math.PI * 2, true);
        }
        else {
            context.rect(-this._originPixelX, -this._originPixelY, this._width, this._height);
        }
        context.closePath();
        context.clip();
    }

    protected _drawBgColor(context: CanvasRenderingContext2D): void {
        if (this.bgColor == null) {
            return;
        }

        context.fillStyle = convertColor(this.bgColor);
        context.beginPath();
        if (this.radius > 0) {
            context.arc(0, 0, this.radius, 0, Math.PI * 2, true);
        }
        else {
            context.rect(-this._originPixelX, -this._originPixelY, this._width, this._height);
        }
        context.closePath();
        context.fill();
    }

    protected _drawBorder(context: CanvasRenderingContext2D): void {
        if (this.borderWidth != null) {
            context.lineWidth = this.borderWidth;
            context.strokeStyle = convertColor(this.borderColor || 0x000);
            context.beginPath();
            if (this.radius > 0) {
                context.arc(0, 0, this.radius, 0, Math.PI * 2, true);
            }
            else {
                context.rect(-this._originPixelX, -this._originPixelY, this._width, this._height);
            }
            context.closePath();
            context.stroke();
        }
    }

    protected draw(context: CanvasRenderingContext2D): void {
        this._clip(context);
        this._drawBgColor(context);
        this._drawBorder(context);

        let texture = this._texture;
        if (!texture || !texture.ready || texture.width === 0 || texture.height === 0) {
            return;
        }

        let sx: number = this.sourceX;
        let sy: number = this.sourceY;
        let sw: number = this.sourceWidth == null ? texture.width : this.sourceWidth;
        let sh: number = this.sourceHeight == null ? texture.height : this.sourceHeight;
        let w = this.width;
        let h = this.height;
        let ox = this._originPixelX;
        let oy = this._originPixelY;
        let grid = this.grid;

        if (!Array.isArray(grid)) {
            context.drawImage(texture.source, sx, sy, sw, sh, -ox, -oy, w, h);
        }
        else {
            // this.grid: [top, right, bottom, left]
            let [top, right, bottom, left] = grid;
            let grids = [
                { x: 0, y: 0, w: left, h: top, sx: sx, sy: sy, sw: left, sh: top },
                { x: left, y: 0, w: w - left - right, h: top, sx: left, sy: 0, sw: sw - left - right, sh: top },
                { x: w - right, y: 0, w: right, h: top, sx: sw - right, sy: 0, sw: right, sh: top },
                { x: 0, y: top, w: left, h: h - top - bottom, sx: 0, sy: top, sw: left, sh: sh - top - bottom },
                { x: left, y: top, w: w - left - right, h: h - top - bottom, sx: left, sy: top, sw: sw - left - right, sh: sh - top - bottom },
                { x: w - right, y: top, w: right, h: h - top - bottom, sx: sw - right, sy: top, sw: right, sh: sh - top - bottom },
                { x: 0, y: h - bottom, w: left, h: bottom, sx: 0, sy: sh - bottom, sw: left, sh: bottom },
                { x: left, y: h - bottom, w: w - left - right, h: bottom, sx: left, sy: sh - bottom, sw: sw - left - right, sh: bottom },
                { x: w - right, y: h - bottom, w: right, h: bottom, sx: sw - right, sy: sh - bottom, sw: right, sh: bottom },
            ];
            grids.forEach(g => {
                context.drawImage(texture.source, g.sx, g.sy, g.sw, g.sh, g.x - ox, g.y - oy, g.w, g.h);
            });
        }
    }

    addChild(target: Sprite<any>, position?: number): void {
        if (target.parent) {
            throw new Error("canvas2d.Sprite.addChild(): Child has been added.");
        }

        if (!this.children) {
            this.children = [];
        }

        var children: Sprite<any>[] = this.children;

        if (children.indexOf(target) < 0) {
            if (position > -1 && position < children.length) {
                children.splice(position, 0, target);
            }
            else {
                children.push(target);
            }
            target.parent = this;
            if (this.stage) {
                target.stage = this.stage;
            }
            target._resizeWidth();
            target._resizeHeight();
        }
    }

    removeChild(target: Sprite<any>): void {
        if (!this.children || !this.children.length) {
            return;
        }
        var index = this.children.indexOf(target);
        if (index > -1) {
            this.children.splice(index, 1);
            target.parent = null;
            target.stage = null;
        }
    }

    removeAllChildren(recusive?: boolean): void {
        if (!this.children || !this.children.length) {
            return;
        }

        while (this.children.length) {
            var sprite: Sprite<any> = this.children[0];

            if (recusive) {
                sprite.removeAllChildren(true);
                Action.stop(sprite);
            }
            this.removeChild(sprite);
        }

        this.children = null;
    }

    contains(target: Sprite<any>) {
        if (!this.children || !this.children.length) {
            return false;
        }
        return this.children.indexOf(target) > -1 || this.children.some(c => c.contains(target));
    }

    release(recusive?: boolean) {
        Action.stop(this);

        if (recusive && this.children) {
            while (this.children.length) {
                this.children[0].release(recusive);
            }
        }
        else {
            this.removeAllChildren();
        }

        if (this.parent) {
            this.parent.removeChild(this);
        }

        ReleasePool.instance.add(this);
    }

    update(deltaTime: number): any {

    }
}

export interface ISprite {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
    originX?: number;
    originY?: number;
    bgColor?: Color;
    radius?: number;
    borderWidth?: number;
    borderColor?: Color;
    texture?: Texture | string;
    rotation?: number;
    opacity?: number;
    visible?: boolean;
    alignX?: AlignType,
    alignY?: AlignType,
    flippedX?: boolean;
    flippedY?: boolean;
    clipOverflow?: boolean;
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
    percentWidth?: number;
    percentHeight?: number;
    grid?: number[];

    /**
     * Position X of the clipping rect on texture
     */
    sourceX?: number;

    /**
     * Position Y of the clipping rect on texture
     */
    sourceY?: number;

    /**
     * Width of the clipping rect on texture
     */
    sourceWidth?: number;

    /**
     * Height of the clipping rect on texture
     */
    sourceHeight?: number;

    /**
     * Use lighter mode
     */
    lighterMode?: boolean;

    /**
     * Auto resize by the texture
     */
    autoResize?: boolean;

    touchEnabled?: boolean;
    mouseEnabled?: boolean;
    keyboardEnabled?: boolean;

    /**
     * Sprite would call this method each frame
     * @param  deltaTime  Duration between now and last frame
     */
    update?(deltaTime: number): any;

    /**
     * Click event handler
     */
    onClick?(e: EventHelper, event: MouseEvent): any;

    /**
     * Mouse begin event handler
     */
    onMouseBegin?(e: EventHelper, event: MouseEvent): any;

    /**
     * Mouse moved event handler
     */
    onMouseMoved?(e: EventHelper, event: MouseEvent): any;

    /**
     * Mouse ended event handler
     */
    onMouseEnded?(e: EventHelper, event: MouseEvent): any;

    /**
     * Touch begin event handler
     */
    onTouchBegin?(touches: EventHelper[], event: TouchEvent): any;

    /**
     * Touch moved event handler
     */
    onTouchMoved?(touches: EventHelper[], event: TouchEvent): any;

    /**
     * Touch ended event hadndler
     */
    onTouchEnded?(touches: EventHelper[], event: TouchEvent): any;

    /**
     * KeyDown event handler
     */
    onKeyDown?(event: KeyboardEvent): any;

    /**
     * KeyUp event handler
     */
    onKeyUp?(event: KeyboardEvent): any;
}
