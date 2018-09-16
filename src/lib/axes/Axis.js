import React, { Component } from "react";
import PropTypes from "prop-types";
import { forceSimulation, forceX, forceCollide } from "d3-force";
import { range as d3Range } from "d3-array";

import GenericChartComponent from "../GenericChartComponent";
import { getAxisCanvas } from "../GenericComponent";
import AxisZoomCapture from "./AxisZoomCapture";

import { noop, first, last, hexToRGBA, isNotDefined, isDefined, identity, zipper, strokeDashTypes, getStrokeDasharray } from "../utils";

class Axis extends Component {
	constructor(props) {
		super(props);
		this.drawOnCanvas = this.drawOnCanvas.bind(this);
		this.saveNode = this.saveNode.bind(this);
		this.getMoreProps = this.getMoreProps.bind(this);
	}

	saveNode(node) {
		this.node = node;
	}
	getMoreProps() {
		return this.node.getMoreProps();
	}

	getCachedSizesKey() {
		const keyProps = [
			'tickPadding',
			'tickLabelFill',
			'tickStroke',
			'tickStrokeOpacity',
			'tickStrokeWidth',
			'orient',
			'showTickLabel',
			'fontSize', 
			'fontFamily', 
			'fontWeight', 
			'showTicks', 
			'flexTicks',
		];
		return keyProps.map(prop => this.props[prop]).join('-');
	}

	getCachedSizes() {
		const { onGetTickLabelDimensions } = this.props;
		if (onGetTickLabelDimensions) {
			const cachedSizesKey = this.getCachedSizesKey();
			if (this.cachedSizesKey !== cachedSizesKey) {
				this.cachedSizesKey = cachedSizesKey;
				this.cachedSizes = {};
			}
		}
		return this.cachedSizes;
	}

	drawOnCanvas(ctx, moreProps) {
		const { showDomain, showTicks, transform, range, getScale, onGetTickLabelDimensions } = this.props;

		ctx.save();
		ctx.translate(transform[0], transform[1]);

		if (showDomain) drawAxisLine(ctx, this.props, range);
		if (showTicks) {
			const tickProps = tickHelper(this.props, getScale(moreProps));
			const measureLabels = Boolean(onGetTickLabelDimensions);
			this.cachedSizes = drawTicks(ctx, tickProps, this.getCachedSizes(), measureLabels);

			ctx.restore();
			if (measureLabels) {
				const tickDimensions = Object.keys(this.cachedSizes).reduce((result, key) => {
					const size = this.cachedSizes[key];
					return {
						width: Math.max(result.width, size.width),
						height: Math.max(result.height, size.height),
					};
				}, {
					width: 0,
					height: 0
				});
	
				onGetTickLabelDimensions(tickDimensions);
			}
		} else {
			ctx.restore();
		}
	}

	render() {
		const { bg, axisZoomCallback, className, zoomCursorClassName, zoomEnabled, getScale, inverted } = this.props;
		const { transform, getMouseDelta, edgeClip } = this.props;
		const { onContextMenu, onDoubleClick } = this.props;

		const zoomCapture = zoomEnabled
			? <AxisZoomCapture
				bg={bg}
				getScale={getScale}
				getMoreProps={this.getMoreProps}
				getMouseDelta={getMouseDelta}
				axisZoomCallback={axisZoomCallback}
				className={className}
				zoomCursorClassName={zoomCursorClassName}
				inverted={inverted}
				onContextMenu={onContextMenu}
				onDoubleClick={onDoubleClick}
			/>
			: null;

		return <g transform={`translate(${ transform[0] }, ${ transform[1] })`}>
			{zoomCapture}
			<GenericChartComponent ref={this.saveNode}
				canvasToDraw={getAxisCanvas}
				clip={false}
				edgeClip={edgeClip}
				canvasDraw={this.drawOnCanvas}
				drawOn={["pan"]}
			/>
		</g>;
	}
}

Axis.propTypes = {
	innerTickSize: PropTypes.number,
	outerTickSize: PropTypes.number,
	tickFormat: PropTypes.func,
	tickPadding: PropTypes.number,
	tickSize: PropTypes.number,
	ticks: PropTypes.number,
	tickLabelFill: PropTypes.string,
	tickStroke: PropTypes.string,
	tickStrokeOpacity: PropTypes.number,
	tickStrokeWidth: PropTypes.number,
	tickStrokeDasharray: PropTypes.oneOf(strokeDashTypes),
	tickValues: PropTypes.oneOfType([PropTypes.array, PropTypes.func]),
	tickInterval: PropTypes.number,
	tickIntervalFunction: PropTypes.func,
	showDomain: PropTypes.bool,
	showTicks: PropTypes.bool,
	className: PropTypes.string,
	axisZoomCallback: PropTypes.func,
	zoomEnabled: PropTypes.bool,
	inverted: PropTypes.bool,
	zoomCursorClassName: PropTypes.string,
	transform: PropTypes.arrayOf(PropTypes.number).isRequired,
	range: PropTypes.arrayOf(PropTypes.number).isRequired,
	getMouseDelta: PropTypes.func.isRequired,
	getScale: PropTypes.func.isRequired,
	bg: PropTypes.object.isRequired,
	edgeClip: PropTypes.bool.isRequired,
	onContextMenu: PropTypes.func,
	onDoubleClick: PropTypes.func,
	onGetTickLabelDimensions: PropTypes.func,
};

Axis.defaultProps = {
	zoomEnabled: false,
	zoomCursorClassName: "",
	edgeClip: false,
};

function tickHelper(props, scale) {
	const {
		orient, innerTickSize, tickFormat, tickPadding,
		tickLabelFill, tickStrokeWidth, tickStrokeDasharray,
		fontSize, fontFamily, fontWeight, showTicks, flexTicks,
		showTickLabel
	} = props;
	const {
		ticks: tickArguments, tickValues: tickValuesProp,
		tickStroke, tickStrokeOpacity, tickInterval, tickIntervalFunction
	} = props;

	// if (tickArguments) tickArguments = [tickArguments];

	let tickValues;
	if (isDefined(tickValuesProp)) {
		if (typeof tickValuesProp === "function") {
			tickValues = tickValuesProp(scale.domain());
		} else {
			tickValues = tickValuesProp;
		}
	} else if (isDefined(tickInterval)) {
		const [min, max] = scale.domain();
		const baseTickValues = d3Range(min, max, (max - min) / tickInterval);

		tickValues = tickIntervalFunction
			? tickIntervalFunction(min, max, tickInterval)
			: baseTickValues;
	} else if (isDefined(scale.ticks)) {
		tickValues = scale.ticks(tickArguments, flexTicks);
	} else {
		tickValues = scale.domain();
	}

	const baseFormat = scale.tickFormat
		? scale.tickFormat(tickArguments)
		: identity;

	const format = isNotDefined(tickFormat)
		? baseFormat
		: d => tickFormat(d) || "";

	const sign = orient === "top" || orient === "left" ? -1 : 1;
	const tickSpacing = Math.max(innerTickSize, 0) + tickPadding;

	let ticks, dy, canvas_dy, textAnchor;

	if (orient === "bottom" || orient === "top") {
		dy = sign < 0 ? "0em" : ".71em";
		canvas_dy = sign < 0 ? 0 : (fontSize * .71);
		textAnchor = "middle";

		ticks = tickValues.map(d => {
			const x = Math.round(scale(d));
			return {
				value: d,
				x1: x,
				y1: 0,
				x2: x,
				y2: sign * innerTickSize,
				labelX: x,
				labelY: sign * tickSpacing,
			};
		});

		if (showTicks && flexTicks) {
			// console.log(ticks, showTicks);
			const nodes = ticks.map(d => ({ id: d.value, value: d.value, fy: d.y2, origX: d.x1 }));

			const simulation = forceSimulation(nodes)
				.force("x", forceX(d => d.origX).strength(1))
				.force("collide", forceCollide(22))
				// .force("center", forceCenter())
				.stop();

			for (let i = 0; i < 100; ++i) simulation.tick();
			// console.log(nodes);

			const zip = zipper()
				.combine((a, b) => {
					if (Math.abs(b.x - b.origX) > 0.01) {
						return {
							...a,
							x2: b.x,
							labelX: b.x
						};
					}
					return a;
				});

			ticks = zip(ticks, nodes);
		}
	} else {
		ticks = tickValues.map(d => {
			const y = Math.round(scale(d));
			return {
				value: d,
				x1: 0,
				y1: y,
				x2: sign * innerTickSize,
				y2: y,
				labelX: sign * tickSpacing,
				labelY: y,
			};
		});

		dy = ".32em";
		canvas_dy = (fontSize * .32);
		textAnchor = sign < 0 ? "end" : "start";
	}

	return {
		ticks, scale, tickStroke,
		tickLabelFill: (tickLabelFill || tickStroke),
		tickStrokeOpacity,
		tickStrokeWidth,
		tickStrokeDasharray,
		dy,
		canvas_dy,
		textAnchor,
		fontSize,
		fontFamily,
		fontWeight,
		format,
		showTickLabel,
		tickSpacing,
	};
}

function drawAxisLine(ctx, props, range) {
	// props = { ...AxisLine.defaultProps, ...props };

	const { orient, outerTickSize, stroke, strokeWidth, opacity } = props;

	const sign = orient === "top" || orient === "left" ? -1 : 1;
	const xAxis = (orient === "bottom" || orient === "top");

	// var range = d3_scaleRange(xAxis ? xScale : yScale);

	ctx.lineWidth = strokeWidth;
	ctx.strokeStyle = hexToRGBA(stroke, opacity);

	ctx.beginPath();

	if (xAxis) {
		ctx.moveTo(first(range), sign * outerTickSize);
		ctx.lineTo(first(range), 0);
		ctx.lineTo(last(range), 0);
		ctx.lineTo(last(range), sign * outerTickSize);
	} else {
		ctx.moveTo(sign * outerTickSize, first(range));
		ctx.lineTo(0, first(range));
		ctx.lineTo(0, last(range));
		ctx.lineTo(sign * outerTickSize, last(range));
	}
	ctx.stroke();
}

function drawTicks(ctx, result, cachedSizes, measureLabels) {
	const { tickStroke, tickStrokeOpacity, tickLabelFill } = result;
	const { textAnchor, fontSize, fontFamily, fontWeight, ticks, showTickLabel } = result;

	ctx.strokeStyle = hexToRGBA(tickStroke, tickStrokeOpacity);

	ctx.fillStyle = tickStroke;
	// ctx.textBaseline = 'middle';

	ticks.forEach((tick) => {
		drawEachTick(ctx, tick, result);
	});

	ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
	ctx.fillStyle = tickLabelFill;
	ctx.textAlign = textAnchor === "middle" ? "center" : textAnchor;

	if (showTickLabel) {
		return ticks.reduce((newCachedSizes, tick) => {
			const newSize = drawEachTickLabel(ctx, tick, result, cachedSizes, measureLabels);
			return {
				...newCachedSizes,
				...newSize
			};
		}, {});
	}
	return cachedSizes;
}

function drawEachTick(ctx, tick, result) {
	const { tickStrokeWidth, tickStrokeDasharray } = result;

	ctx.beginPath();

	ctx.moveTo(tick.x1, tick.y1);
	ctx.lineTo(tick.x2, tick.y2);
	ctx.lineWidth = tickStrokeWidth;
	ctx.setLineDash(getStrokeDasharray(tickStrokeDasharray).split(","));
	ctx.stroke();
}

function drawEachTickLabel(ctx, tick, result, cachedSizes, measureLabels) {
	const { orient, canvas_dy, format, fontSize, tickSpacing } = result;
	const xAxis = (orient === "bottom" || orient === "top");

	const text = format(tick.value);
	ctx.beginPath();
	ctx.fillText(text, tick.labelX, tick.labelY + canvas_dy);

	if (measureLabels) {
		if (cachedSizes[text]) {
			return {
				text: cachedSizes[text]
			};
		} else {
			const { width } = ctx.measureText(text);

			const widthSpacing = xAxis ? 0 : tickSpacing;
			const heightSpacing = xAxis ? tickSpacing : 0;

			return {
				[text]: {
					width:  widthSpacing + width,
					height: heightSpacing + fontSize
				}
			};
		}
	} else {
		return {};
	}
}

export default Axis;
