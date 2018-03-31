package greycatincub.rocksdb.test.readDB;

import greycat.Graph;
import greycat.GraphBuilder;
import greycat.Node;
import greycat.NodeIndex;
import greycat.internal.ReadOnlyStorage;
import greycat.rocksdb.RocksDBStorage;

import java.util.Arrays;

public class ReadRunner {

    public static void main(String[] args) {
        if(args.length != 4) {
            System.err.println("Error in args. Usage: java <exec> <DB_PATH> <WORLD> <TIME> <INDEX_NAME>. Get: " + Arrays.toString(args));
            return;
        }

        final String dbPath = args[0];
        final long world = Long.parseLong(args[1]);
        final long time = Long.parseLong(args[2]);
        final String indexName = args[3];


        RocksDBStorage db = new RocksDBStorage(dbPath);
        Graph graph = new GraphBuilder()
                .withStorage(new ReadOnlyStorage(db))
                .build();

        graph.connect((Boolean coOK) -> {
           graph.index(world, time, indexName, (NodeIndex idx) -> {
                idx.findFrom((Node[] node) -> {
                    System.out.println(Arrays.toString(node));
                });
           });
        });

    }
}
