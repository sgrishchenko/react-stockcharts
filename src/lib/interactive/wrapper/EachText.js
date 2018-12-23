import React, { Component } from "react";
import PropTypes from "prop-types";
import debounce from "lodash.debounce";

import { noop } from "../../utils";
import { saveNodeType, isHover } from "../utils";
import { getXValue } from "../../utils/ChartDataUtil";

import HoverTextNearMouse from "../components/HoverTextNearMouse";
import InteractiveText from "../components/InteractiveText";

class EachText extends Component {
	constructor(props) {
		super(props);

		this.handleHover = debounce(this.handleHover.bind(this), 1000);

		this.handleDragStart = this.handleDragStart.bind(this);
		this.handleDrag = this.handleDrag.bind(this);

		this.isHover = isHover.bind(this);
		this.saveNodeType = saveNodeType.bind(this);
		this.nodes = {};

		this.state = {
			hover: false,
		};
	}
	handleDragStart(moreProps) {
		const {
			position,
		} = this.props;
		const { mouseXY } = moreProps;
		const { chartConfig: { yScale }, xScale } = moreProps;
		const [mouseX, mouseY] = mouseXY;

		const [textCX, textCY] = position;
		const dx = mouseX - xScale(textCX);
		const dy = mouseY - yScale(textCY);

		this.dragStartPosition = {
			position, dx, dy
		};
	}
	handleDrag(moreProps) {
		const { index, onDrag } = this.props;
		const {
			mouseXY: [, mouseY],
			chartConfig: { yScale },
			xAccessor,
			mouseXY,
			plotData,
			xScale,
		} = moreProps;

		const { dx, dy } = this.dragStartPosition;
		const xValue = xScale.invert(
			xScale(getXValue(xScale, xAccessor, mouseXY, plotData)) - dx
		);
		// xScale.invert(xScale(xAccessor(currentItem)) - dx);
		const xyValue = [
			xValue,
			yScale.invert(mouseY - dy)
		];

		onDrag(index, xyValue);
	}
	handleHover(moreProps, hoverRect) {
		if (this.state.hover !== moreProps.hovering) {
			this.setState({
				hover: moreProps.hovering,
				hoverRect: hoverRect || null
			});
		}
	}

	onDeleteControlHover() {

	}

	onDeleteControlUnHover() {
		
	}

	renderDeleteControl() {
		const {hoverRect} = this.state;
		if (hoverRect) {
			const deleteButtonWidth = 20;
			const deleteButtonPadding = 15;
			const left = hoverRect.x + hoverRect.width + deleteButtonPadding;
			const top = hoverRect.y + (hoverRect.height - deleteButtonWidth) / 2;
			const width = deleteButtonWidth;
			const height = deleteButtonWidth;

			const makeEvent = name => e => {
				console.log(name, e);
			};

			return (
				<g
					onMouseEnter={makeEvent('onmouseenter 1')}
					onMouseLeave={makeEvent('onmouseleave 1')}
				>
					<rect 
						x={left} 
						y={top} 
						width={width} 
						height={height} 
						fill={'red'} 
						onMouseEnter={makeEvent('onmouseenter 2')}
						onMouseLeave={makeEvent('onmouseleave 2')}	
					/>
				</g>
			);
		}
		else {
			return null;
		}
	}

	render() {
		const {
			position,
			bgFill,
			bgFillHover,
			bgOpacity,
			bgStroke,
			bgStrokeHover,
			bgStrokeWidth,
			textFill,
			textFillHover,
			fontFamily,
			fontSize,
			fontWeight,
			fontStyle,
			text,
			hoverText,
			selected,
			onDragComplete,
			strokeWhenHovered,
			textPadding,
		} = this.props;
		const { hover } = this.state;

		const hoverHandler = {
			onHover: this.handleHover,
			onUnHover: this.handleHover
		};

		const {
			enable: hoverTextEnabled,
			selectedText: hoverTextSelected,
			text: hoverTextUnselected,
			...restHoverTextProps
		} = hoverText;

		const props = {
			onDragComplete,
			position,
			bgFill,
			bgFillHover,
			bgOpacity,
			bgStroke: bgStroke || textFill,
			bgStrokeHover: bgStrokeHover || textFillHover,
			bgStrokeWidth,
			textFill,
			textFillHover,
			fontFamily,
			fontStyle,
			fontWeight,
			fontSize,
			text,
			textPadding,
		};

		return <g>
			<InteractiveText
				ref={this.saveNodeType("text")}
				selected={selected || (hover && strokeWhenHovered)}
				interactiveCursorClass="react-stockcharts-move-cursor"
				{...hoverHandler}
				{...props}

				onDragStart={this.handleDragStart}
				onDrag={this.handleDrag}
			/>
			{this.renderDeleteControl()}
			<HoverTextNearMouse
				show={hoverTextEnabled && hover}
				{...restHoverTextProps}
				text={selected ? hoverTextSelected : hoverTextUnselected}
			/>
		</g>;
	}
}

EachText.propTypes = {
	index: PropTypes.number,

	position: PropTypes.array.isRequired,

	bgFill: PropTypes.string.isRequired,
	bgFillHover: PropTypes.string,

	bgOpacity: PropTypes.number.isRequired,

	bgStrokeWidth: PropTypes.number.isRequired,
	bgStroke: PropTypes.string,
	bgStrokeHover: PropTypes.string,

	textFill: PropTypes.string.isRequired,
	textFillHover: PropTypes.string,

	fontWeight: PropTypes.string.isRequired,
	fontFamily: PropTypes.string.isRequired,
	fontStyle: PropTypes.string.isRequired,
	fontSize: PropTypes.number.isRequired,

	text: PropTypes.string.isRequired,
	selected: PropTypes.bool.isRequired,

	onDrag: PropTypes.func.isRequired,
	onDragComplete: PropTypes.func.isRequired,

	hoverText: PropTypes.object.isRequired,
	textPadding: PropTypes.number,
	strokeWhenHovered: PropTypes.bool.isRequired,
};

EachText.defaultProps = {
	onDrag: noop,
	onDragComplete: noop,
	textPadding: undefined,	
	strokeWhenHovered: true,
	bgOpacity: 1,
	bgStrokeWidth: 1,
	selected: false,
	fill: "#8AAFE2",
	hoverText: {
		...HoverTextNearMouse.defaultProps,
		enable: true,
		bgHeight: "auto",
		bgWidth: "auto",
		text: "Click to select object",
	}
};

export default EachText;