#!/bin/bash
# Carbon Nebula 服务器监控告警脚本
# 每小时执行一次，检查关键指标

ALERT_LOG=/var/log/cnx-monitor.log
DISK_THRESHOLD=85
MEM_THRESHOLD=90

echo "[$(date)] === 监控检查开始 ===" >> $ALERT_LOG

# 1. 磁盘使用率
DISK_USE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USE -gt $DISK_THRESHOLD ]; then
    echo "[$(date)] ⚠️ 磁盘使用率告警: ${DISK_USE}% (阈值 ${DISK_THRESHOLD}%)" >> $ALERT_LOG
fi

# 2. 内存使用率
MEM_USE=$(free | awk 'NR==2 {printf "%.0f", $3/$2*100}')
if [ $MEM_USE -gt $MEM_THRESHOLD ]; then
    echo "[$(date)] ⚠️ 内存使用率告警: ${MEM_USE}% (阈值 ${MEM_THRESHOLD}%)" >> $ALERT_LOG
fi

# 3. Docker 容器状态
RUNNING=$(docker ps -q | wc -l)
TOTAL=$(docker ps -aq | wc -l)
if [ $RUNNING -lt $TOTAL ]; then
    echo "[$(date)] ⚠️ 容器异常: ${RUNNING}/${TOTAL} 运行中" >> $ALERT_LOG
fi

# 4. 应用健康检查
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
if [ "$HTTP_CODE" != "200" ]; then
    echo "[$(date)] ⚠️ 应用健康检查失败: HTTP ${HTTP_CODE}" >> $ALERT_LOG
fi

echo "[$(date)] === 监控检查完成 ===" >> $ALERT_LOG

# 保留 7 天日志
find /var/log -name "cnx-monitor.log" -mtime +7 -delete
