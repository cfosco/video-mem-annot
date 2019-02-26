# usage: ./dump_db.sh db_name user_name
read -s -p "Password:" p

tables=(users videos levels presentations)
for t in "${tables[@]}"; do
    echo 'SELECT * FROM ' "$t" | mysql -B -u"$2" -p"$p" "$1" > "$t".tsv
done
