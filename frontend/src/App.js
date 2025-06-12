import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [productTimeConfig, setProductTimeConfig] = useState({
    'ProductA': 120, // minutes
    'ProductB': 90,
    'ProductC': 150,
    'ProductD': 180,
    'Default': 100
  });
  const [csvData, setCsvData] = useState(null);
  const fileInputRef = useRef(null);

  // Sample CSV data structure - replace with actual CSV reader
  const sampleData = [
    { id: 'WO-001', name: 'Work Order 001', priority: 'High', productType: 'ProductA' },
    { id: 'WO-002', name: 'Work Order 002', priority: 'Medium', productType: 'ProductB' },
    { id: 'WO-003', name: 'Work Order 003', priority: 'High', productType: 'ProductC' },
    { id: 'WO-004', name: 'Work Order 004', priority: 'Low', productType: 'ProductA' },
    { id: 'WO-005', name: 'Work Order 005', priority: 'Medium', productType: 'ProductD' },
    { id: 'WO-006', name: 'Work Order 006', priority: 'High', productType: 'ProductB' },
    { id: 'WO-007', name: 'Work Order 007', priority: 'Medium', productType: 'ProductC' },
    { id: 'WO-008', name: 'Work Order 008', priority: 'Low', productType: 'ProductA' },
    { id: 'WO-009', name: 'Work Order 009', priority: 'High', productType: 'ProductD' },
    { id: 'WO-010', name: 'Work Order 010', priority: 'Medium', productType: 'ProductB' },
    { id: 'WO-011', name: 'Work Order 011', priority: 'Low', productType: 'ProductC' },
    { id: 'WO-012', name: 'Work Order 012', priority: 'High', productType: 'ProductA' }
  ];

  useEffect(() => {
    // Initialize work orders with calculated times
    const dataToUse = csvData || sampleData;
    const processedOrders = calculateQueueTimes(dataToUse);
    setWorkOrders(processedOrders);
  }, [csvData, productTimeConfig]);

  useEffect(() => {
    // Update current time every minute for automatic progression
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const parsed = parseCSV(text);
        setCsvData(parsed);
      };
      reader.readAsText(file);
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header.toLowerCase().replace(/\s+/g, '')] = values[index] || '';
        });
        
        // Map CSV columns to our data structure
        data.push({
          id: row.id || row.orderid || row.workorderid || `WO-${i}`,
          name: row.name || row.ordername || row.description || `Work Order ${i}`,
          priority: row.priority || 'Medium',
          productType: row.producttype || row.product || row.parttype || row.partnumber || 'Default'
        });
      }
    }
    return data;
  };

  const calculateQueueTimes = (orders) => {
    let cumulativeTime = new Date();
    
    return orders.map((order, index) => {
      const processTime = productTimeConfig[order.productType] || productTimeConfig['Default'];
      const startTime = new Date(cumulativeTime);
      const endTime = new Date(cumulativeTime.getTime() + processTime * 60000);
      
      cumulativeTime = endTime;
      
      return {
        ...order,
        processTime,
        startTime,
        endTime,
        status: index === 0 ? 'In Progress' : 'Queued',
        position: index + 1
      };
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'border-red-400 bg-red-500/20 text-red-300';
      case 'medium': return 'border-yellow-400 bg-yellow-500/20 text-yellow-300';
      case 'low': return 'border-green-400 bg-green-500/20 text-green-300';
      default: return 'border-gray-400 bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'bg-gradient-to-r from-yellow-400 to-yellow-500';
      case 'Queued': return 'bg-gradient-to-r from-slate-500 to-slate-600';
      case 'Completed': return 'bg-gradient-to-r from-green-500 to-green-600';
      default: return 'bg-gradient-to-r from-slate-500 to-slate-600';
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString();
  };

  // Calculate progress for current work order
  const getCurrentProgress = (order) => {
    if (order.status !== 'In Progress') return 0;
    
    const totalTime = order.endTime - order.startTime;
    const elapsedTime = currentTime - order.startTime;
    const progress = Math.max(0, Math.min(100, (elapsedTime / totalTime) * 100));
    
    return progress;
  };

  const downloadSampleCSV = () => {
    const csvContent = "id,name,priority,productType\n" +
      "WO-001,Work Order 001,High,ProductA\n" +
      "WO-002,Work Order 002,Medium,ProductB\n" +
      "WO-003,Work Order 003,Low,ProductC\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_work_orders.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const TimelineHeader = () => {
    const startTime = workOrders.length > 0 ? workOrders[0].startTime : new Date();
    const endTime = workOrders.length > 0 ? workOrders[workOrders.length - 1].endTime : new Date();
    const totalHours = Math.ceil((endTime - startTime) / (1000 * 60 * 60));
    
    return (
      <div className="flex items-center justify-between mb-4 text-white">
        <div className="flex items-center space-x-6">
          <div className="text-lg font-semibold">
            Timeline: {formatDate(startTime)}
          </div>
          <div className="text-sm text-slate-300">
            Duration: {totalHours}h {Math.ceil(((endTime - startTime) % (1000 * 60 * 60)) / (1000 * 60))}m
          </div>
        </div>
        <div className="text-lg font-bold text-yellow-400">
          {formatTime(currentTime)}
        </div>
      </div>
    );
  };

  const GanttChart = () => {
    if (workOrders.length === 0) return <div className="text-white text-center">Loading...</div>;

    const startTime = workOrders[0].startTime;
    const endTime = workOrders[workOrders.length - 1].endTime;
    const totalDuration = endTime - startTime;

    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-4">
        <TimelineHeader />
        
        {/* GANTT Chart Grid */}
        <div className="grid gap-2">
          {workOrders.map((order, index) => {
            const orderDuration = order.endTime - order.startTime;
            const startOffset = ((order.startTime - startTime) / totalDuration) * 100;
            const width = (orderDuration / totalDuration) * 100;
            const progress = getCurrentProgress(order);

            return (
              <div key={order.id} className="flex items-center gap-3 h-12">
                {/* Work Order Info */}
                <div className="w-48 flex-shrink-0">
                  <div className="bg-slate-700/80 backdrop-blur-sm rounded border border-slate-600 p-2 h-full flex items-center">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="text-white font-medium text-sm">{order.id}</div>
                        <div className="text-slate-300 text-xs">{order.productType}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(order.priority)}`}>
                        {order.priority[0]}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-8 bg-slate-700/50 rounded border border-slate-600">
                  <div 
                    className={`absolute h-full rounded ${getStatusColor(order.status)} flex items-center justify-center text-slate-900 text-xs font-bold transition-all duration-1000 shadow-lg`}
                    style={{
                      left: `${startOffset}%`,
                      width: `${width}%`
                    }}
                  >
                    {order.status === 'In Progress' && (
                      <div className="absolute inset-0 bg-yellow-600 rounded transition-all duration-1000"
                           style={{ width: `${progress}%` }}>
                      </div>
                    )}
                    <span className="relative z-10 text-xs font-bold">
                      {order.status === 'In Progress' ? `${Math.round(progress)}%` : `${order.processTime}m`}
                    </span>
                  </div>
                </div>

                {/* Time Display */}
                <div className="w-24 text-right text-xs text-slate-300">
                  {formatTime(order.startTime)}
                </div>

                {/* Position */}
                <div className="w-12 text-center">
                  <div className="bg-yellow-500/20 border border-yellow-400 text-yellow-300 px-2 py-1 rounded text-xs font-bold">
                    #{order.position}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Time Indicator */}
        <div className="relative mt-4">
          <div className="h-0.5 bg-slate-600 rounded"></div>
          <div 
            className="absolute top-0 w-0.5 h-8 bg-red-400 transform -translate-x-0.25 shadow-lg"
            style={{
              left: `${Math.max(0, Math.min(100, ((currentTime - startTime) / totalDuration) * 100))}%`
            }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-400 text-slate-900 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
              NOW
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CSVUploadSection = () => {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Load Work Orders</h3>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 px-4 py-2 rounded font-semibold transition-colors"
          >
            Upload CSV
          </button>
          <button
            onClick={downloadSampleCSV}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded font-medium transition-colors border border-slate-500"
          >
            Download Sample
          </button>
          <div className="text-slate-300 text-sm">
            CSV Format: id, name, priority, productType
          </div>
        </div>
      </div>
    );
  };

  const ProductTimeConfig = () => {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Process Times</h3>
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(productTimeConfig).map(([product, time]) => (
            <div key={product} className="bg-slate-700/60 rounded p-3 text-center border border-slate-600">
              <div className="text-slate-300 text-sm font-medium">{product}</div>
              <div className="text-xl font-bold text-yellow-400">{time}m</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const QueueSummary = () => {
    const totalOrders = workOrders.length;
    const inProgress = workOrders.filter(o => o.status === 'In Progress').length;
    const queued = workOrders.filter(o => o.status === 'Queued').length;
    const highPriority = workOrders.filter(o => o.priority === 'High').length;

    return (
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-400">{totalOrders}</div>
          <div className="text-sm text-slate-300">Total Orders</div>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400">{inProgress}</div>
          <div className="text-sm text-slate-300">In Progress</div>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-400">{queued}</div>
          <div className="text-sm text-slate-300">Queued</div>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-400">{highPriority}</div>
          <div className="text-sm text-slate-300">High Priority</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 aspect-video">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Production Queue Dashboard</h1>
          <p className="text-slate-300">Real-time GANTT Chart Visualization</p>
        </div>

        {/* CSV Upload Section */}
        <CSVUploadSection />

        <div className="flex-1 mt-4 space-y-4">
          {/* Queue Summary */}
          <QueueSummary />

          {/* Main GANTT Chart */}
          <div className="flex-1">
            <GanttChart />
          </div>

          {/* Product Time Configuration */}
          <ProductTimeConfig />
        </div>
      </div>
    </div>
  );
};

export default App;