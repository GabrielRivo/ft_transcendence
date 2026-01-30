import { useEffect, useRef, createElement } from 'my-react'; 
import ApexCharts, { ApexOptions } from 'apexcharts';

interface EloHistogramProps {
  userElo: number;
  allPlayersData: number[];
  username : string;
}

const EloHistogram = ({ userElo, allPlayersData, username }: EloHistogramProps) => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<ApexCharts | null>(null);

  const BAR_COUNT = 10;
  const COLOR_SCALE_MAX = 2500; 

  const processData = () => {
    const safeData = allPlayersData.length > 0 ? allPlayersData : [userElo];
    
    const minRaw = Math.min(...safeData, userElo);
    const maxRaw = Math.max(...safeData, userElo);

    let range = maxRaw - minRaw;
    if (range === 0) range = 100;

    const step = range / BAR_COUNT;

    const buckets = new Array(BAR_COUNT).fill(0);
    const categories: string[] = [];
    const rawCategoryValues: number[] = [];

    for (let i = 0; i < BAR_COUNT; i++) {
        const rangeStart = Math.floor(minRaw + (i * step));
        const rangeEnd = Math.floor(minRaw + ((i + 1) * step));
        categories.push(`${rangeStart}-${rangeEnd}`);
        rawCategoryValues.push(rangeEnd); 
    }

    safeData.forEach((playerElo) => {
        let index = Math.floor((playerElo - minRaw) / step);
        if (index >= BAR_COUNT) index = BAR_COUNT - 1; 
        if (index < 0) index = 0;
        buckets[index]++;
    });

    const userIndex = Math.floor((userElo - minRaw) / step);
    const clampedUserIndex = Math.min(Math.max(userIndex, 0), BAR_COUNT - 1);
    
    // On calcule la position X approximative pour l'annotation
    // ApexCharts sur un bar chart distribué utilise les index des catégories (0, 1, 2...) ou les labels exacts
    const annotationX = categories[clampedUserIndex];

    return { categories, counts: buckets, rawCategoryValues, annotationX };
  };

  const getColors = (values: number[]): string[] => {
    return values.map((val) => {
      let percent = val / COLOR_SCALE_MAX;
      if (percent > 1) percent = 1;
      if (percent < 0) percent = 0;
      const hue = Math.round(percent * 120);
      return `hsl(${hue}, 80%, 50%)`;
    });
  };

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const { categories, counts, rawCategoryValues, annotationX } = processData();
    const colors = getColors(rawCategoryValues);

    const options: ApexOptions = {
      chart: {
        type: 'bar',
        height: 200,
        animations: { enabled: true },
        toolbar: { show: false },
        background: 'transparent',
        fontFamily: 'Helvetica, Arial, sans-serif',
        foreColor: '#ccc' 
      },
      theme: {
        mode: 'dark'
      },
      series: [{
        name: 'Joueurs',
        data: counts
      }],
      colors: colors,
      plotOptions: {
        bar: {
          columnWidth: '95%',
          distributed: true,
          borderRadius: 2,
          dataLabels: {
            position: 'top', 
          },
        }
      },
      grid: {
        borderColor: '#333',
        strokeDashArray: 3,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: { top: 0, right: 0, bottom: 0, left: 10 }
      },
      legend: { show: false },
      dataLabels: { 
        enabled: true,
        offsetY: -20,
        style: {
          fontSize: '12px',
          colors: ["#ccc"]
        }
      },
      xaxis: {
        categories: categories,
        labels: {
          rotate: -45,
          style: { 
            fontSize: '10px',
            colors: '#aaa'
          },
          offsetY: 2
        },
        title: { 
            text: 'ELO RANGE',
            style: {
                color: '#ccc',
                fontSize: '14px',
                fontWeight: 600,
            },
            offsetY: -5
        },
        axisBorder: { show: true, color: '#444' },
        axisTicks: { show: true, color: '#444' },
        tickPlacement: 'on' 
      },
      yaxis: {
        labels: {
            style: { colors: '#aaa', fontSize: '11px' },
             formatter: (val) => val.toFixed(0)
        },
        axisBorder: { show: false }
      },
      tooltip: {
        theme: 'dark',
        x: {
          show: true
        },
        marker: { show: false },
      },
      annotations: {
        xaxis: [
          {
            x: annotationX, 
            borderColor: '#fff',
            strokeDashArray: 0,
            borderWidth: 2,
            opacity: 0.9,
            label: {
              borderColor: 'transparent',
              style: {
                color: '#fff',
                background: '#000',
                fontSize: '13px',
                fontWeight: 'bold',
                padding: { left: 8, right: 8, top: 4, bottom: 4 }
              },
              text: `(${username}) (${userElo})`,
              orientation: 'horizontal',
              offsetY: -25,
            }
          }
        ]
      }
    };

    const chart = new ApexCharts(chartRef.current, options);
    chart.render();
    chartInstance.current = chart as ApexCharts;

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null; 
      }
    };
  }, [userElo, allPlayersData]);

  return <div ref={chartRef} className="w-full min-h-[200px]" />;
};

export default EloHistogram;