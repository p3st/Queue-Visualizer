import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const App = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [productTimeConfig, setProductTimeConfig] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState(null);
  const [draggedOrder, setDraggedOrder] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    // Load initial data
    loadWorkOrders();
    loadProductTimes();
  }, []);

  useEffect(() => {
    // Update current time every minute for automatic progression
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const loadWorkOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${BACKEND_URL}/api/work-orders`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const processedOrders = calculateQueueTimes(data.work_orders);
      setWorkOrders(processedOrders);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading work orders:', err);
      setError('Failed to load work orders from database');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductTimes = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/product-times`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setProductTimeConfig(data.product_times);
    } catch (err) {
      console.error('Error loading product times:', err);
      // Use default times if API fails
      setProductTimeConfig({
        'Default': 240
      });
    }
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${BACKEND_URL}/api/work-orders/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const processedOrders = calculateQueueTimes(data.work_orders);
      setWorkOrders(processedOrders);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data from database');
    } finally {
      setIsLoading(false);
    }
  };

  const sortByPriority = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${BACKEND_URL}/api/work-orders/priority-sort`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const processedOrders = calculateQueueTimes(data.work_orders);
      setWorkOrders(processedOrders);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error sorting by priority:', err);
      setError('Failed to sort by priority');
    } finally {
      setIsLoading(false);
    }
  };

  const reorderWorkOrders = async (newOrder) => {
    try {
      const reorderData = {
        work_orders: newOrder.map((order, index) => ({
          id: order.id,
          position: index + 1
        }))
      };

      const response = await fetch(`${BACKEND_URL}/api/work-orders/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reorderData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processedOrders = calculateQueueTimes(data.work_orders);
      setWorkOrders(processedOrders);
    } catch (err) {
      console.error('Error reordering work orders:', err);
      setError('Failed to reorder work orders');
      // Reload original order on error
      loadWorkOrders();
    }
  };

  const calculateQueueTimes = (orders) => {
    let cumulativeTime = new Date();
    
    return orders.map((order, index) => {
      const processTime = productTimeConfig[order.productType] || productTimeConfig['Default'] || 240;
      const startTime = new Date(cumulativeTime);
      const endTime = new Date(cumulativeTime.getTime() + processTime * 60000);
      
      cumulativeTime = endTime;
      
      return {
        ...order,
        processTime,
        startTime,
        endTime,
        status: index === 0 ? 'In Progress' : 'Queued',
        queuePosition: index + 1
      };
    });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, order, index) => {
    setDraggedOrder({ order, index });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.parentNode);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedOrder(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (!draggedOrder || draggedOrder.index === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newWorkOrders = [...workOrders];
    const draggedItem = newWorkOrders[draggedOrder.index];
    
    // Remove the dragged item
    newWorkOrders.splice(draggedOrder.index, 1);
    
    // Insert at new position
    newWorkOrders.splice(dropIndex, 0, draggedItem);
    
    // Update local state immediately for better UX
    const updatedOrders = calculateQueueTimes(newWorkOrders);
    setWorkOrders(updatedOrders);
    
    // Send to backend
    reorderWorkOrders(newWorkOrders);
    
    setDragOverIndex(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'border-red-400 bg-red-500/20 text-red-300';
      case 'medium': return 'border-yellow-400 bg-yellow-500/20 text-yellow-300';
      case 'low': return 'border-green-400 bg-green-500/20 text-green-300';
      default: return 'border-gray-400 bg-gray-500/20 text-gray-300';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '📋';
      default: return '📋';
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

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Calculate progress for current work order
  const getCurrentProgress = (order) => {
    if (order.status !== 'In Progress') return 0;
    
    const totalTime = order.endTime - order.startTime;
    const elapsedTime = currentTime - order.startTime;
    const progress = Math.max(0, Math.min(100, (elapsedTime / totalTime) * 100));
    
    return progress;
  };

  const DatabaseStatus = () => {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-white">Queue Management</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm">Database Connected</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-slate-300 text-sm">
              Last Update: {formatTime(lastRefresh)}
            </div>
            <button
              onClick={sortByPriority}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sorting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <span>Priority Sort</span>
                </>
              )}
            </button>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-700 disabled:opacity-50 text-slate-900 px-4 py-2 rounded font-semibold transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">
            {error}
          </div>
        )}
        <div className="mt-2 text-slate-400 text-sm">
          💡 <strong>Tip:</strong> Drag and drop work orders to reorder the queue, or use Priority Sort for automatic ordering
        </div>
      </div>
    );
  };

  const TimelineHeader = () => {
    if (workOrders.length === 0) return null;
    
    const startTime = workOrders[0].startTime;
    const endTime = workOrders[workOrders.length - 1].endTime;
    const totalMinutes = Math.ceil((endTime - startTime) / (1000 * 60));
    
    return (
      <div className="flex items-center justify-between mb-4 text-white">
        <div className="flex items-center space-x-6">
          <div className="text-lg font-semibold">
            Production Timeline: {formatDate(startTime)}
          </div>
          <div className="text-sm text-slate-300">
            Total Duration: {formatDuration(totalMinutes)}
          </div>
          {isDragging && (
            <div className="text-sm text-yellow-400 animate-pulse">
              🔄 Reordering queue...
            </div>
          )}
        </div>
        <div className="text-lg font-bold text-yellow-400">
          Current Time: {formatTime(currentTime)}
        </div>
      </div>
    );
  };

  const GanttChart = () => {
    if (isLoading) {
      return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-8 text-center">
          <div className="text-white text-lg">Loading work orders from database...</div>
          <div className="mt-4 flex justify-center">
            <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      );
    }

    if (workOrders.length === 0) {
      return (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-8 text-center">
          <div className="text-white text-lg">No work orders found in database</div>
        </div>
      );
    }

    const startTime = workOrders[0].startTime;
    const endTime = workOrders[workOrders.length - 1].endTime;
    const totalDuration = endTime - startTime;

    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-4">
        <TimelineHeader />
        
        {/* GANTT Chart with Drag & Drop */}
        <div className="overflow-auto max-h-96 scrollbar-custom">
          <div className="min-w-full">
            <div className="grid gap-2 min-w-max">
              {workOrders.map((order, index) => {
                const orderDuration = order.endTime - order.startTime;
                const startOffset = ((order.startTime - startTime) / totalDuration) * 100;
                const width = (orderDuration / totalDuration) * 100;
                const progress = getCurrentProgress(order);

                const isDropTarget = dragOverIndex === index;
                const isDraggedItem = draggedOrder?.index === index;

                return (
                  <div 
                    key={order.id} 
                    className={`flex items-center gap-3 h-16 min-w-max transition-all duration-200 ${
                      isDropTarget ? 'bg-yellow-500/10 border-yellow-400 border-2 border-dashed rounded' : ''
                    } ${isDraggedItem ? 'opacity-50 scale-95' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    {/* Drag Handle & Work Order Info */}
                    <div className="w-72 flex-shrink-0">
                      <div className="bg-slate-700/80 backdrop-blur-sm rounded border border-slate-600 p-3 h-full flex items-center cursor-move hover:bg-slate-600/80 transition-colors">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            {/* Drag Handle */}
                            <div className="text-slate-400 hover:text-yellow-400 transition-colors">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM8 6a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H9zm0 4a1 1 0 100 2h2a1 1 0 100-2H9z" />
                              </svg>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-lg">{getPriorityIcon(order.priority)}</span>
                                <div className="text-white font-medium text-sm truncate">{order.id}</div>
                              </div>
                              <div className="text-slate-300 text-xs truncate">{order.name}</div>
                              <div className="text-slate-400 text-xs">{order.productType}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(order.priority)}`}>
                              {order.priority}
                            </div>
                            <div className="bg-slate-600 text-slate-300 px-2 py-1 rounded text-xs font-bold">
                              #{order.queuePosition}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-12 bg-slate-700/50 rounded border border-slate-600 min-w-96">
                      <div 
                        className={`absolute h-full rounded ${getStatusColor(order.status)} flex items-center justify-center text-slate-900 text-xs font-bold transition-all duration-1000 shadow-lg`}
                        style={{
                          left: `${startOffset}%`,
                          width: `${width}%`,
                          minWidth: '80px'
                        }}
                      >
                        {order.status === 'In Progress' && (
                          <div className="absolute inset-0 bg-yellow-600 rounded transition-all duration-1000"
                               style={{ width: `${progress}%` }}>
                          </div>
                        )}
                        <span className="relative z-10 text-xs font-bold">
                          {order.status === 'In Progress' ? `${Math.round(progress)}%` : formatDuration(order.processTime)}
                        </span>
                      </div>
                    </div>

                    {/* Time Display */}
                    <div className="w-36 text-right text-xs text-slate-300 flex-shrink-0">
                      <div className="font-semibold">{formatTime(order.startTime)}</div>
                      <div className="text-slate-400">to {formatTime(order.endTime)}</div>
                      <div className="text-yellow-400 font-bold">{formatDuration(order.processTime)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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

  const ProductTimeConfig = () => {
    if (Object.keys(productTimeConfig).length === 0) return null;
    
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-600 p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Process Times by Product Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-32 overflow-y-auto scrollbar-custom">
          {Object.entries(productTimeConfig)
            .filter(([product]) => product !== 'Default')
            .sort(([,a], [,b]) => b - a) // Sort by time descending
            .map(([product, time]) => (
              <div key={product} className="bg-slate-700/60 rounded p-3 text-center border border-slate-600">
                <div className="text-slate-300 text-xs font-medium truncate" title={product}>
                  {product}
                </div>
                <div className="text-lg font-bold text-yellow-400">{formatDuration(time)}</div>
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
    const totalTime = workOrders.reduce((sum, order) => sum + order.processTime, 0);

    return (
      <div className="grid grid-cols-5 gap-4 mb-4">
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
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-400">{formatDuration(totalTime)}</div>
          <div className="text-sm text-slate-300">Total Time</div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-white mb-1">Interactive Production Queue</h1>
          <p className="text-slate-300">Drag & Drop Queue Management with Priority Sorting</p>
        </div>

        {/* Database Status Section */}
        <DatabaseStatus />

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