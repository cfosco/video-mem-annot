import os 
import csv
from mysql.connector import MySQLConnection, Error

DUMPPATH = "dump"
HOST = "mysql.csail.mit.edu"
DB_NAME = "memento_prod"

USERS = {
    'unsafe': 'memento-game',
    'readonly': 'memento_readonly',
    'vidwrite': 'memento_videos'
}

def getconfig(user, host=HOST): 
    if not os.environ.get('MYSQL_PROD_PASS', ''): 
        raise RuntimeError("Please set the environment var MYSQL_PROD_PASS")

    return {
        'host': host,
        'user': user,
        'database': DB_NAME,
        'password': os.environ['MYSQL_PROD_PASS']
    }

def iter_row(cursor, size=10):
    while True:
        rows = cursor.fetchmany(size)
        if not rows:
            break
        for row in rows:
            yield row

# executes a function against the db
def execute(user, f): 
    conf = getconfig(user)
    try: 
        conn = MySQLConnection(**conf)
        if conn.is_connected(): 
            print("Established connection.")
        else: 
            raise RuntimeError("Connection failed")
        return f(conn)        
    finally: 
        conn.close()
        print("Connection closed")

def get_tables(conn):
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    return cursor.fetchall()

def dbdump(path): 
    def _dump(conn): 
        tables = get_tables(conn)
        for t in tables: 
            nrecords = 0
            with open(os.path.join(path, "%s.csv" % t), "w") as outfile: 
                writer = csv.writer(outfile)

                cursor = conn.cursor()
                cursor.execute("SELECT * FROM %s" % t)
                col_names = [i[0] for i in cursor.description]
                writer.writerow(col_names)

                for row in iter_row(cursor, 10):
                    writer.writerow(row)
                    nrecords += 1
            print("Table %s: dumped %d records" % (t, nrecords))

    execute(USERS["unsafe"], _dump)

if __name__ == "__main__": 
    # dump the db 
    dbdump(DUMPPATH)
