import React from "react";
import PropTypes from "prop-types";
import memoize from "lodash.memoize";
import { utcDay } from "d3-time";

import { ChartCanvas, Chart } from "react-stockcharts";
import { CandlestickSeries } from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import { last, timeIntervalBarWidth } from "react-stockcharts/lib/utils";

import { discontinuousTimeScaleProvider } from "react-stockcharts/lib/scale";
import { fitWidth } from "react-stockcharts/lib/helper";

class ChartWithAxis extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			leftAxis: 0,
			rightAxis: 0,
			topAxis: 0,
			bottomAxis: 0,
		};

		this.updateAxisWidth = memoize(side => width => {
			const sideKey = side + "Axis";
			const oldWidth = this.state[sideKey];
			if (oldWidth < width) {
				this.setState({
					[side + "Axis"]: width
				});
			}
		});
	}
	render() {
		const { type, data: initialData, width, ratio } = this.props;
		const {	leftAxis, rightAxis, topAxis, bottomAxis } = this.state;

		const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(
			d => d.date
		);
		const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(
			initialData
		);

		const start = xAccessor(last(data));
		const end = xAccessor(data[Math.max(0, data.length - 150)]);
		const xExtents = [start, end];
		const tickLength = 20;
		const margin = {
			left: leftAxis.width + tickLength,
			right: rightAxis.width + tickLength,
			top: topAxis.height + tickLength,
			bottom: bottomAxis.height + tickLength
		};

		return (
			<ChartCanvas
				height={400}
				ratio={ratio}
				width={width}
				margin={margin}
				type={type}
				seriesName="MSFT"
				data={data}
				xScale={xScale}
				xAccessor={displayXAccessor}
				xExtents={xExtents}
			>
				<Chart id={1} yExtents={[d => [d.high, d.low]]}>
					<XAxis axisAt="bottom" orient="bottom" onGetAxisWidth={this.updateAxisWidth("bottom")} />
					<XAxis axisAt="top" orient="top" onGetAxisWidth={this.updateAxisWidth("top")} />
					<YAxis axisAt="right" orient="right" onGetAxisWidth={this.updateAxisWidth("right")} />
					<YAxis axisAt="left" orient="left" onGetAxisWidth={this.updateAxisWidth("left")} />
					<CandlestickSeries width={timeIntervalBarWidth(utcDay)}/>
				</Chart>
			</ChartCanvas>
		);
	}
}

ChartWithAxis.propTypes = {
	data: PropTypes.array.isRequired,
	width: PropTypes.number.isRequired,
	ratio: PropTypes.number.isRequired,
	type: PropTypes.oneOf(["svg", "hybrid"]).isRequired
};

ChartWithAxis.defaultProps = {
	type: "svg"
};
const ChartWithAxisFit = fitWidth(ChartWithAxis);

export default ChartWithAxisFit;
