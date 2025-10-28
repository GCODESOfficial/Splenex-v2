// Performance monitoring dashboard component
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Zap, 
  Clock, 
  Database, 
  TrendingUp, 
  RefreshCw,
  BarChart3,
  Cpu
} from 'lucide-react';
import { performanceMonitor } from '@/lib/performance-optimizer';
import { cacheAnalytics } from '@/lib/enhanced-cache';

interface PerformanceMetrics {
  balanceFetch: { average: number; count: number };
  quoteFetch: { average: number; count: number };
  swapExecution: { average: number; count: number };
  swapOptimization: { average: number; count: number };
}

interface CacheStats {
  balance: { size: number; totalSize: number; hitRate: number };
  quote: { size: number; totalSize: number; hitRate: number };
  price: { size: number; totalSize: number; hitRate: number };
  gas: { size: number; totalSize: number; hitRate: number };
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        updateMetrics();
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const updateMetrics = () => {
    const perfMetrics = performanceMonitor.getMetrics();
    const cacheMetrics = cacheAnalytics.getCacheStats();
    
    setMetrics(perfMetrics as PerformanceMetrics);
    setCacheStats(cacheMetrics);
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      updateMetrics();
    }
  };

  const clearMetrics = () => {
    performanceMonitor['metrics'].clear();
    cacheAnalytics['metrics'] = {
      hits: 0,
      misses: 0,
      evictions: 0,
      warmUps: 0,
    };
    updateMetrics();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getPerformanceColor = (ms: number, type: string) => {
    const thresholds = {
      balanceFetch: { good: 2000, warning: 5000 },
      quoteFetch: { good: 1000, warning: 3000 },
      swapExecution: { good: 10000, warning: 30000 },
      swapOptimization: { good: 500, warning: 1000 },
    };
    
    const threshold = thresholds[type as keyof typeof thresholds];
    if (ms <= threshold.good) return 'text-green-600';
    if (ms <= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Performance Dashboard
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
          >
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button onClick={clearMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Metrics
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics && Object.entries(metrics).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {key === 'balanceFetch' && <Database className="h-4 w-4" />}
                {key === 'quoteFetch' && <Zap className="h-4 w-4" />}
                {key === 'swapExecution' && <Activity className="h-4 w-4" />}
                {key === 'swapOptimization' && <Cpu className="h-4 w-4" />}
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`text-2xl font-bold ${getPerformanceColor(value.average, key)}`}>
                  {formatTime(value.average)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {value.count} operations
                </div>
                <Progress 
                  value={Math.min((value.average / 10000) * 100, 100)} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(cacheStats).map(([type, stats]) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{type}</span>
                    <Badge variant={stats.hitRate > 0.8 ? "default" : stats.hitRate > 0.5 ? "secondary" : "destructive"}>
                      {(stats.hitRate * 100).toFixed(1)}% hit rate
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stats.size} entries
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatSize(stats.totalSize)} memory
                  </div>
                  <Progress value={stats.hitRate * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Balance Fetching</p>
                <p className="text-sm text-muted-foreground">
                  Optimized with parallel chain processing and intelligent caching
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Quote Fetching</p>
                <p className="text-sm text-muted-foreground">
                  Parallel aggregator calls with 3s timeout for fastest response
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Swap Execution</p>
                <p className="text-sm text-muted-foreground">
                  Pre-approval checks and gas optimization for smoother transactions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium">Smart Caching</p>
                <p className="text-sm text-muted-foreground">
                  LRU eviction, TTL management, and user pattern-based prefetching
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Real-time Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics ? Object.values(metrics).reduce((sum, m) => sum + m.count, 0) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Total Operations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {cacheStats ? Object.values(cacheStats).reduce((sum, c) => sum + c.size, 0) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Cache Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {cacheStats ? 
                  (Object.values(cacheStats).reduce((sum, c) => sum + c.hitRate, 0) / 4 * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Hit Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
