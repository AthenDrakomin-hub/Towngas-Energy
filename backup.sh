#!/bin/bash
# Carbon Nebula 数据库每日备份
BACKUP_DIR=/opt/backups/carbon-nebula
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE=$BACKUP_DIR/cnx_db_$DATE.sql.gz

echo "[$(date)] 开始备份..."

# 备份 PostgreSQL
docker exec cnx-db pg_dump -U cnx -d cnx_prod | gzip > $BACKUP_FILE

if [ $? -eq 0 ]; then
    SIZE=$(ls -lh $BACKUP_FILE | awk '{print $5}')
    echo "[$(date)] 备份成功: $BACKUP_FILE ($SIZE)"
else
    echo "[$(date)] 备份失败!"
    exit 1
fi

# 删除 7 天前的备份
find $BACKUP_DIR -name 'cnx_db_*.sql.gz' -mtime +7 -delete
echo "[$(date)] 清理 7 天前旧备份完成"
