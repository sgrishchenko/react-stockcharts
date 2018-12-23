import React, { Component } from "react";
import PropTypes from "prop-types";

import GenericChartComponent from "../../GenericChartComponent";
import { getMouseCanvas } from "../../GenericComponent";

import { isDefined, noop, hexToRGBA } from "../../utils";

const lineHeightFactor = 0.25;

class InteractiveText extends Component {
	constructor(props) {
		super(props);

		this.calculateTextWidth = true;

		this.renderSVG = this.renderSVG.bind(this);
		this.drawOnCanvas = this.drawOnCanvas.bind(this);
		this.isHover = this.isHover.bind(this);
		this.onHover = this.onHover.bind(this);
	}
	isHover(moreProps) {
		const { onHover } = this.props;

		if (
			isDefined(onHover)
			&& isDefined(this.textWidth)
			&& !this.calculateTextWidth
		) {
			const { rect } = this.getCoords(moreProps);
			const { mouseXY: [x, y] } = moreProps;

			if (
				x >= rect.x
				&& y >= rect.y
				&& x <= rect.x + rect.width
				&& y <= rect.y + rect.height
			) {
				this.hoverRect = rect;
				return true;
			}
		}
		return false;
	}
	componentWillReceiveProps(nextProps) {
		this.calculateTextWidth = (
			nextProps.text !== this.props.text
			|| nextProps.fontStyle !== this.props.fontStyle
			|| nextProps.fontWeight !== this.props.fontWeight
			|| nextProps.fontSize !== this.props.fontSize
			|| nextProps.fontFamily !== this.props.fontFamily
		);
	}

	getCoords(moreProps) {
		const textArr = this.props.text.split('\n');
		return helper.call(this, this.props, moreProps, this.textWidth, textArr.length);
	}

	getLineHeight() {
		return this.props.fontSize + this.getLineStep();
	}

	getLineStep() {
		return this.props.fontSize * lineHeightFactor;
	}

	getColor(hover) { 
		return (color, hoveredColor) => hover
			? hoveredColor || color
			: color;
	}

	drawOnCanvas(ctx, moreProps) {
		const {
			bgFill,
			bgFillHover,
			bgOpacity,
			bgStrokeWidth,
			bgStroke,
			bgStrokeHover,
			textFill,
			textFillHover,
			fontFamily,
			fontSize,
			fontStyle,
			fontWeight,
			text,
		} = this.props;

		const getColor = this.getColor(moreProps.hovering);

		const bgFillColor = getColor(bgFill, bgFillHover);
		const bgStrokeColor = getColor(bgStroke, bgStrokeHover);
		const textFillColor = getColor(textFill, textFillHover);

		const textArr = text.split('\n');
		if (this.calculateTextWidth) {
			ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
			this.textWidth = textArr.reduce((maxWidth, txt) => Math.max(
				maxWidth,
				ctx.measureText(txt).width
			), 0);
			this.calculateTextWidth = false;
		}

		const { selected } = this.props;

		const { x, y, rect } = this.getCoords(moreProps);

		ctx.fillStyle = hexToRGBA(bgFillColor, bgOpacity);

		ctx.beginPath();
		ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

		if (selected) {
			ctx.strokeStyle = bgStrokeColor;
			ctx.lineWidth = bgStrokeWidth;
			ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
		}

		ctx.fillStyle = textFillColor;
		ctx.textBaseline = "top";
		ctx.textAlign = "start";
		ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

		ctx.beginPath();
		let yOut = y;
		const lineHeight = this.getLineHeight();
		textArr.forEach(txt => {
			ctx.fillText(txt, x, yOut);
			yOut += lineHeight;
		});
	}

	onHover(moreProps) {
		console.info('onHover', moreProps);
		const { onHover } = this.props;
		if (onHover) {
			onHover(moreProps, this.hoverRect);
		}
	}

	renderSVG() {
		throw new Error("svg not implemented");
	}
	render() {
		const { selected, interactiveCursorClass } = this.props;
		const { onUnHover } = this.props;
		const { onDragStart, onDrag, onDragComplete } = this.props;

		return <GenericChartComponent
			isHover={this.isHover}

			svgDraw={this.renderSVG}
			canvasToDraw={getMouseCanvas}
			canvasDraw={this.drawOnCanvas}

			interactiveCursorClass={interactiveCursorClass}
			selected={selected}

			onDragStart={onDragStart}
			onDrag={onDrag}
			onDragComplete={onDragComplete}
			onHover={this.onHover}
			onUnHover={onUnHover}

			drawOn={["mousemove", "mouseleave", "pan", "drag"]}
		/>;
	}
}

function helper(props, moreProps, textWidth, textLineCount) {
	const { position, fontSize, textPadding } = props;

	const { xScale, chartConfig: { yScale } } = moreProps;

	const [xValue, yValue] = position;
	const x = xScale(xValue);
	const y = yScale(yValue);

	const padding = textPadding == undefined
		? fontSize / 2
		: textPadding;

	const rectHeight = this.getLineHeight() * textLineCount - this.getLineStep() + padding * 2;
	const rectWidth = textWidth + padding * 2;
	const rect = {
		x: x - rectWidth / 2,
		y: y - rectHeight / 2,
		width: rectWidth,
		height: rectHeight,
	};

	return {
		x: rect.x + padding,
		y: rect.y + padding, 
		rect
	};
}

InteractiveText.propTypes = {
	bgFill: PropTypes.string.isRequired,
	bgFillHover: PropTypes.string,

	bgOpacity: PropTypes.number.isRequired,

	bgStrokeWidth: PropTypes.number.isRequired,
	bgStroke: PropTypes.string.isRequired,
	bgStrokeHover: PropTypes.string,

	textFill: PropTypes.string.isRequired,
	textFillHover: PropTypes.string,

	fontFamily: PropTypes.string.isRequired,
	fontSize: PropTypes.number.isRequired,
	fontWeight: PropTypes.oneOfType([
		PropTypes.number,
		PropTypes.string,
	]).isRequired,
	fontStyle: PropTypes.string.isRequired,

	text: PropTypes.string.isRequired,

	onDragStart: PropTypes.func.isRequired,
	onDrag: PropTypes.func.isRequired,
	onDragComplete: PropTypes.func.isRequired,
	onHover: PropTypes.func,
	onUnHover: PropTypes.func,

	defaultClassName: PropTypes.string,
	interactiveCursorClass: PropTypes.string,

	tolerance: PropTypes.number.isRequired,
	textPadding: PropTypes.number.isRequired,
	selected: PropTypes.bool.isRequired,
};

InteractiveText.defaultProps = {
	onDragStart: noop,
	onDrag: noop,
	onDragComplete: noop,

	type: "SD", // standard dev
	fontWeight: "normal", // standard dev

	tolerance: 4,
	selected: false,
};

export default InteractiveText;