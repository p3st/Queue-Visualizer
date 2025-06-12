import React, { useState, useEffect } from 'react';
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
    { id: 'WO-010', name: 'Work Order 010', priority: 'Medium', productType: 'ProductB' }
  ];

  useEffect(() => {
    // Initialize work orders with calculated times
    const processedOrders = calculateQueueTimes(sampleData);
    setWorkOrders(processedOrders);
  }, []);

  useEffect(() => {
    // Update current time every minute for automatic progression
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

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
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-600';
      case 'Queued': return 'bg-gray-400';
      case 'Completed': return 'bg-green-600';
      default: return 'bg-gray-400';
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

  const TimelineHeader = () => {
    const startTime = workOrders.length > 0 ? workOrders[0].startTime : new Date();
    const endTime = workOrders.length > 0 ? workOrders[workOrders.length - 1].endTime : new Date();
    const totalHours = Math.ceil((endTime - startTime) / (1000 * 60 * 60));
    
    return (
      <div className="flex items-center space-x-4 mb-6">
        <div className="text-xl font-bold text-gray-800">
          Production Timeline: {formatDate(startTime)}
        </div>
        <div className="text-lg text-gray-600">
          Total Duration: {totalHours}h {Math.ceil(((endTime - startTime) % (1000 * 60 * 60)) / (1000 * 60))}m
        </div>
        <div className="text-lg text-blue-600 font-semibold">
          Current Time: {formatTime(currentTime)}
        </div>
      </div>
    );
  };

  const GanttChart = () => {
    if (workOrders.length === 0) return <div>Loading...</div>;

    const startTime = workOrders[0].startTime;
    const endTime = workOrders[workOrders.length - 1].endTime;
    const totalDuration = endTime - startTime;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <TimelineHeader />
        
        {/* GANTT Chart */}
        <div className="space-y-4">
          {workOrders.map((order, index) => {
            const orderDuration = order.endTime - order.startTime;
            const startOffset = ((order.startTime - startTime) / totalDuration) * 100;
            const width = (orderDuration / totalDuration) * 100;
            const progress = getCurrentProgress(order);

            return (
              <div key={order.id} className="flex items-center space-x-4">
                {/* Work Order Info */}
                <div className="w-80 flex-shrink-0">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg">{order.id}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold text-white ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{order.name}</div>
                    <div className="text-sm text-gray-500">
                      Product: {order.productType} | Time: {order.processTime}min
                    </div>
                    <div className="text-sm font-semibold mt-2">
                      {formatTime(order.startTime)} - {formatTime(order.endTime)}
                    </div>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-16 bg-gray-100 rounded-lg">
                  <div 
                    className={`absolute h-full rounded-lg ${getStatusColor(order.status)} flex items-center justify-center text-white font-semibold transition-all duration-1000`}
                    style={{
                      left: `${startOffset}%`,
                      width: `${width}%`
                    }}
                  >
                    {order.status === 'In Progress' && (
                      <div className="absolute inset-0 bg-blue-700 rounded-lg transition-all duration-1000"
                           style={{ width: `${progress}%` }}>
                      </div>
                    )}
                    <span className="relative z-10 text-sm">
                      {order.status === 'In Progress' ? `${Math.round(progress)}%` : order.status}
                    </span>
                  </div>
                </div>

                {/* Position */}
                <div className="w-16 text-center">
                  <div className="bg-indigo-100 text-indigo-800 px-3 py-2 rounded-full text-sm font-bold">
                    #{order.position}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Time Indicator */}
        <div className="relative mt-6">
          <div className="h-1 bg-gray-200 rounded"></div>
          <div 
            className="absolute top-0 w-1 h-12 bg-red-500 transform -translate-x-0.5"
            style={{
              left: `${Math.max(0, Math.min(100, ((currentTime - startTime) / totalDuration) * 100))}%`
            }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap">
              NOW
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ProductTimeConfig = () => {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
        <h3 className="text-xl font-bold mb-4">Product Processing Times Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(productTimeConfig).map(([product, time]) => (
            <div key={product} className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="font-semibold text-gray-800">{product}</div>
              <div className="text-2xl font-bold text-blue-600">{time}min</div>
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-600 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{totalOrders}</div>
          <div className="text-sm">Total Orders</div>
        </div>
        <div className="bg-green-600 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{inProgress}</div>
          <div className="text-sm">In Progress</div>
        </div>
        <div className="bg-yellow-600 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{queued}</div>
          <div className="text-sm">Queued</div>
        </div>
        <div className="bg-red-600 text-white p-6 rounded-lg text-center">
          <div className="text-3xl font-bold">{highPriority}</div>
          <div className="text-sm">High Priority</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Production Queue Dashboard</h1>
          <p className="text-lg text-gray-600">Real-time GANTT Chart Visualization</p>
        </div>

        {/* Queue Summary */}
        <QueueSummary />

        {/* Main GANTT Chart */}
        <GanttChart />

        {/* Product Time Configuration */}
        <ProductTimeConfig />
      </div>
    </div>
  );
};

export default App;