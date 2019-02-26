source creds.sh;
npx forever start -l /data/vision/oliva/scratch/memento-mem-game/logs/forever.log -o /data/vision/oliva/scratch/memento-mem-game/logs/out.log -e /data/vision/oliva/scratch/memento-mem-game/logs/err.log -fa --fifo --uid "memento-prod" bin/www;
